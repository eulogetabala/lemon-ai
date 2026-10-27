import { getSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { supabase, userId } = await getSupabaseServerClient()
        if (!userId) return new NextResponse('Unauthorized', { status: 401 })

        const filter = request.nextUrl.searchParams.get('filter')

        const [typesRes, userChannelsRes] = await Promise.all([
            supabase.from("channel_types")
                .select("*")
                .order("created_at", { ascending: true }),
            supabase.from("user_channels")
                .select("*")
                .eq("user_id", userId)
        ]);

        if (typesRes.error || userChannelsRes.error) {
            console.error('[channel/GET] Supabase error:', JSON.stringify(typesRes.error ?? userChannelsRes.error))
            return new NextResponse('Internal Server Error', { status: 500 })
        }

        const typesById = new Map(
            (typesRes.data || []).map(type => [type.id, type])
        )

        // Connected accounts (user_channels joined with channel_types). Facebook
        // users may have several rows: one per connected Page.
        const accounts = (userChannelsRes.data || [])
            .filter(channel => channel.is_connected)
            .map(channel => {
                const type = typesById.get(channel.channel_type_id)
                return {
                    id: channel.id,
                    channel_type_id: channel.channel_type_id,
                    type: type?.type?.toUpperCase() ?? null,
                    name: type?.name ?? null,
                    color: type?.color ?? null,
                    character_limit: type?.character_limit ?? null,
                    handle: channel.handle ?? null,
                    profile_image: channel.profile_image ?? null,
                    profile_url: channel.profile_url ?? null,
                    provider_account_id: channel.provider_account_id ?? null,
                }
            })
            .filter(account => account.type)

        const accountsByType = new Map<string, typeof accounts>()
        accounts.forEach(account => {
            const list = accountsByType.get(account.channel_type_id) ?? []
            list.push(account)
            accountsByType.set(account.channel_type_id, list)
        })

        let channels = (typesRes.data || []).map(channel_type => {
            const typeAccounts = accountsByType.get(channel_type.id) ?? []
            const primary = typeAccounts[0] ?? null
            // DB stores lowercase type ('twitter'), enum expects uppercase ('TWITTER')
            return {
                id: channel_type.id,
                type: channel_type.type.toUpperCase(),
                name: channel_type.name,
                color: channel_type.color,
                character_limit: channel_type.character_limit,
                user_channel_id: primary?.id ?? null,
                handle: primary?.handle ?? null,
                profile_image: primary?.profile_image ?? null,
                profile_url: primary?.profile_url ?? null,
                connected: typeAccounts.length > 0
            }
        })

        const totalChannels = typesRes.data?.length || 0;
        const connectedCount = channels.filter(channel => channel.connected).length;

        if (filter === 'connected') {
            channels = channels.filter(channel => channel.connected);
        } else if (filter === 'unconnected') {
            channels = channels.filter(channel => !channel.connected);
        }

        return NextResponse.json({ channels, accounts, totalChannels, connectedCount })

    } catch (error) {
        console.error('Error fetching channels:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
