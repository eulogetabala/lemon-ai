import { ChannelTypeEnum } from "@/constants/channels";
import { encrypt } from "@/lib/encryption";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { buildProviderRedirectUri, getOAuthProvider, getRequestOrigin } from "@/lib/social-oauth";
import {
  FACEBOOK_PAGE_SELECT_COOKIE,
  encodeFacebookPageSelectSession,
} from "@/lib/social-oauth/facebook-pages";
import { getPkceCookieName } from "@/lib/social-oauth/pkce";
import { verifyOAuthState } from "@/lib/social-oauth/state";
import { OAuthProvider } from "@/lib/social-oauth/types";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

function buildRedirectUrl(appUrl: string, redirectTo: string, params: Record<string, string>) {
    const url = new URL(redirectTo, appUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const requestOrigin = getRequestOrigin(request);
    const appUrl = (APP_URL || requestOrigin || request.nextUrl.origin).replace(/\/+$/, "");

    const code = searchParams.get('code');
    const stateParams = searchParams.get('state');
    const providerError = searchParams.get('error');
    const providerErrorDescription = searchParams.get('error_description');

    if (!stateParams) {
        return buildRedirectUrl(appUrl, '/settings', { connected: "false", error: "missing_state" });
    }

    try {
        const state = verifyOAuthState(stateParams);
        const redirectTo = state?.redirectTo || `${appUrl}/settings`;
        const pkceCookieName = getPkceCookieName(stateParams);
        const codeVerifier = state.channelType === ChannelTypeEnum.TWITTER
            ? request.cookies.get(pkceCookieName)?.value
            : undefined

        if (providerError) {
            // Prefer the human-readable description the provider sends back
            // (e.g. X/Twitter) so the user sees the real reason in the toast.
            const message = (providerErrorDescription || providerError)
                .slice(0, 180)
                .trim() || providerError
            const response = buildRedirectUrl(appUrl, redirectTo, { connected: "false", error: message })
            response.cookies.delete(pkceCookieName)
            return response
        }

        if (!code) {
            const response = buildRedirectUrl(appUrl, redirectTo, { connected: "false", error: "missing_code" })
            response.cookies.delete(pkceCookieName)
            return response
        }

        // The callback is a public route (see proxy.ts): Clerk's session is not
        // guaranteed here because providers redirect cross-site. The `state`
        // payload is HMAC-signed and verified above, so `state.userId` is the
        // authoritative user id for the rest of this flow.
        const provider = getOAuthProvider(state.channelType) as OAuthProvider;
        const redirectUri = buildProviderRedirectUri(state.channelType, requestOrigin || request.nextUrl.origin);
        console.log(`[oauth] ${state.channelType} callback redirect_uri: ${redirectUri}`);

        const token = await provider.exchangeCodeForToken({ code, redirectUri, codeVerifier })

        // Facebook publishing requires a Page, not the personal profile. Instead of
        // silently connecting the first Page returned by the API, hand control to the
        // user: stash the (long-lived) user token in a short-lived cookie and open the
        // Page picker. `/api/channel/facebook/select` then stores the chosen Page.
        if (state.channelType === ChannelTypeEnum.FACEBOOK) {
          const session = encodeFacebookPageSelectSession({
            userId: state.userId,
            channelTypeId: state.channelTypeId,
            userAccessToken: token.accessToken,
            tokenExpiresAt: token.expiresAt ?? null,
          })
          const response = buildRedirectUrl(appUrl, redirectTo, {
            fb_page_select: "true",
            channelType: state.channelType,
          })
          response.cookies.set(FACEBOOK_PAGE_SELECT_COOKIE, session, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 30,
          })
          response.cookies.delete(pkceCookieName)
          return response
        }

        const profile = await provider.getProfile({ accessToken: token.accessToken })

        console.log("callback profile:", JSON.stringify(profile, null, 2))

        const supabase = getSupabaseAdminClient()

        const payload = {
            user_id: state.userId,
            channel_type_id: state.channelTypeId,
            provider_account_id: profile.providerAccountId ?? null,
            handle: profile.handle ?? null,
            profile_url: profile.profileUrl ?? null,
            profile_image: profile.profileImage ?? null,
            access_token: encrypt(profile.accessToken ?? token.accessToken),
            refresh_token: encrypt(token.refreshToken ?? null),
            token_expires_at: token.expiresAt ?? null,
            is_connected: true,
            is_active: true,
        }

        const { error } = await supabase
            .from("user_channels")
            .upsert(payload, { onConflict: "user_id,channel_type_id,provider_account_id" })

        if (error) {
            console.error('Supabase upsert error:', JSON.stringify(error))
            const response = buildRedirectUrl(appUrl, redirectTo, { connected: "false", error: "failed_to_upsert_user_channel" })
            response.cookies.delete(pkceCookieName)
            return response
        }

        const response = buildRedirectUrl(appUrl, redirectTo, { connected: "true", channelType: state.channelType })
        response.cookies.delete(pkceCookieName)
        return response

    } catch (error) {
        console.error('OAuth callback error:', error);
        const message = error instanceof Error ? error.message : "oauth_callback_failed"
        // Keep the message short for the URL query string (toasts read it).
        const errorCode = message
          .slice(0, 180)
          .replace(/[^\w\s\-àâäéèêëïîôùûüç'.,]/gi, "")
          .trim() || "oauth_callback_failed"
        const response = buildRedirectUrl(appUrl, '/settings', {
          connected: "false",
          error: errorCode,
        });
        const stateParam = new URL(request.url).searchParams.get('state');
        if (stateParam) response.cookies.delete(getPkceCookieName(stateParam));
        return response;
    }
}
