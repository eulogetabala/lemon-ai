import { ChannelTypeEnum } from "@/constants/channels";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { buildProviderRedirectUri, getOAuthProvider, getRequestOrigin } from "@/lib/social-oauth";
import { createPkcePair, getPkceCookieName } from "@/lib/social-oauth/pkce";
import { createOAuthState } from "@/lib/social-oauth/state";
import { checkChannelConnectLimit, resolvePlanForUserId } from "@/lib/plan-limits-server";
import { getWorkspaceFromRequest } from "@/lib/request-workspace";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL

export async function POST(request: NextRequest) {
    try {
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 401 });

        const planId = await resolvePlanForUserId(userId);
        const workspace = await getWorkspaceFromRequest(request, supabase, userId);

        const { channelTypeId } = await request.json();
        if (!channelTypeId) return NextResponse.json({ error: 'Channel type ID is required' }, { status: 400 });

        const { data: channelType, error } = await supabase
            .from("channel_types")
            .select("id, type")
            .eq("id", channelTypeId)
            .single();

        if (error || !channelType) {
            return NextResponse.json({ error: 'Channel type not found' }, { status: 404 });
        }

        // Check plan limits before initiating OAuth:
        // If this channel type is not already connected, enforce max connected channels limit
        const { data: existingChannel } = await supabase
            .from("user_channels")
            .select("id")
            .eq("user_id", userId)
            .eq("workspace_id", workspace.id)
            .eq("channel_type_id", channelTypeId)
            .eq("is_connected", true)
            .maybeSingle();

        if (!existingChannel) {
            const limitCheck = await checkChannelConnectLimit(supabase, userId, planId, workspace.id);
            if (!limitCheck.allowed) {
                return NextResponse.json(
                    { error: limitCheck.message || "Limite de canaux atteinte pour votre forfait. Passez au forfait Pro pour connecter des canaux illimités." },
                    { status: 403 }
                );
            }
        }

        // Return the user to wherever they initiated the connection (the browser
        // origin), NOT to the tunnel. The tunnel is only used for the provider
        // callback below (Instagram/Threads require an HTTPS redirect_uri).
        const requestOrigin = getRequestOrigin(request);
        const baseUrl = (requestOrigin || request.nextUrl.origin).replace(/\/+$/, "");
        const redirectTo = `${baseUrl}/settings`;
        // DB stores lowercase ('twitter'), enum is uppercase ('TWITTER') — normalise
        const normalizedType = channelType.type.toUpperCase() as ChannelTypeEnum;
        const provider = getOAuthProvider(normalizedType);

        if (!provider) {
            return NextResponse.json({ error: `Channel type "${channelType.type}" is not supported yet` }, { status: 400 });
        }

        const state = createOAuthState({
            userId,
            channelTypeId: channelType.id,
            channelType: normalizedType,
            redirectTo,
            workspaceId: workspace.id,
        })

        const callbackUrl = buildProviderRedirectUri(normalizedType, requestOrigin || request.nextUrl.origin);
        console.log(`[oauth] ${normalizedType} redirect_uri: ${callbackUrl}`);
        if (
            APP_URL &&
            requestOrigin &&
            APP_URL.replace(/\/+$/, "") !== requestOrigin.replace(/\/+$/, "")
        ) {
            console.warn(
                `[oauth] NEXT_PUBLIC_APP_URL (${APP_URL}) differs from the request origin (${requestOrigin}). Using: ${callbackUrl}`
            );
        }

        const pkce = normalizedType === ChannelTypeEnum.TWITTER ? createPkcePair() : null

        const url = provider.getAuthorizationUrl({
            state,
            redirectUri: callbackUrl,
            codeChallenge: pkce?.codeChallenge,
            codeChallengeMethod: pkce?.codeChallengeMethod,
        })

        console.log(`[oauth] ${normalizedType} auth_url: ${url}`)

        const response = NextResponse.json({ url })

        if (pkce) {
            response.cookies.set(getPkceCookieName(state), pkce.codeVerifier, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 10,
            })
        }

        return response;

    } catch (error) {
        console.error('Error connecting channel:', error);
        return NextResponse.json({ error: 'Failed to connect channel' }, { status: 500 });
    }
}
