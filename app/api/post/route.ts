import { POST_STATUS } from "@/constants/post";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ImageObject } from "@/types/post.type";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type PostType = {
    userChannelId?: string
    channelTypeId?: string
    content: string
    images?: ImageObject[]
}

export async function GET(request: NextRequest) {
    try {
        const { supabase, userId } = await getSupabaseServerClient()
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get("status")
        const channelIds = searchParams.getAll("channelIds")
            .flatMap((channel) => channel.split(",")).filter(Boolean)
        const groupByDate = searchParams.get("group_by_date") === "true";

        let postQuery = supabase
            .from("scheduled_posts")
            .select("*, user_channels(*, channel_types(id, type, name, color, character_limit))")
            .eq("user_id", userId)
            .order("scheduled_at", { ascending: false })

        if (status) postQuery = postQuery.eq("status", status)
        if (channelIds.length > 0) postQuery = postQuery.in("user_channel_id", channelIds)

        const { data: posts, error } = await postQuery;
        if (error) throw error;

        if (!groupByDate) return NextResponse.json({ posts: posts ?? [] })

        const groupMap = new Map<string, { label: string; posts: typeof posts }>();
        (posts ?? []).forEach((post) => {
            const date = new Date(post.scheduled_at);
            const key = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

            if (!groupMap.has(key)) {
                groupMap.set(key, { label: formatDayLabel(date), posts: [] });
            }
            groupMap.get(key)!.posts.push(post);
        });

        const groupPosts = Array.from(groupMap.entries()).map(([key, value]) => ({ key, ...value }));
        return NextResponse.json({ groupPosts })

    } catch (error) {
        console.error("Error getting posts:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { has, userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { supabase } = await getSupabaseServerClient()
        const { posts, scheduledAt, status } = await request.json()

        if (status !== undefined && status !== POST_STATUS.DRAFT) {
            return NextResponse.json({ error: "Only draft status is allowed" }, { status: 400 })
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            return NextResponse.json({ error: "Posts array is required and cannot be empty" }, { status: 400 })
        }

        const normalizedPosts = posts.filter(Boolean).map((post) => ({
            userChannelId: post.userChannelId,
            channelTypeId: post.channelTypeId,
            content: post.content,
            images: post.images || []
        }))

        if (normalizedPosts.length === 0) {
            return NextResponse.json({ error: "No valid posts provided" }, { status: 400 })
        }

        const isPaidPlan = has({ plan: "pro" }) || has({ plan: "premium" })
        if (!isPaidPlan) {
            const canCreate = await checkCreatePostLimit(supabase, userId)
            if (!canCreate) {
                return NextResponse.json({ error: "You have reached your post limit, upgrade" }, { status: 403 })
            }
        }

        const invalidPost = normalizedPosts.find((post) => !post.content);
        if (invalidPost) return NextResponse.json({ error: "Post content is required" }, { status: 400 })

        const { data: userChannels, error: userChannelsError } = await supabase
            .from("user_channels")
            .select("id, channel_type_id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .eq("is_connected", true)

        if (userChannelsError) return NextResponse.json({ error: "Failed to fetch user channels" }, { status: 500 })
        if (!userChannels || userChannels.length === 0) return NextResponse.json({ error: "No active channels found" }, { status: 404 })

        const connectedById = new Map(userChannels.map((uc) => [uc.id, uc]))
        const connectedByType = new Map(userChannels.map((uc) => [uc.channel_type_id, uc]))

        const missingChannel = normalizedPosts.find((post) => {
            if (post.userChannelId) return !connectedById.has(post.userChannelId)
            if (post.channelTypeId) return !connectedByType.has(post.channelTypeId)
            return true
        })
        if (missingChannel) return NextResponse.json({ error: "No active channel found for the post" }, { status: 404 })

        if (!scheduledAt) return NextResponse.json({ error: "Scheduled at is required" }, { status: 400 })

        const postStatus = status === POST_STATUS.DRAFT ? POST_STATUS.DRAFT : POST_STATUS.QUEUE;
        const payload = normalizedPosts.map((post) => {
            const userChannel = post.userChannelId
                ? connectedById.get(post.userChannelId)!
                : connectedByType.get(post.channelTypeId!)!
            return {
                user_id: userId,
                user_channel_id: userChannel.id,
                content: post.content,
                images: post.images,
                scheduled_at: scheduledAt,
                status: postStatus
            }
        })

        const { data, error } = await supabase
            .from("scheduled_posts")
            .insert(payload)
            .select()

        if (error) {
            console.error("Error creating posts:", error)
            return NextResponse.json({ error: "Failed to create posts" }, { status: 500 })
        }

        return NextResponse.json({ posts: data }, { status: 201 })

    } catch (error) {
        console.error("Error creating post:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

async function checkCreatePostLimit(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>['supabase'], userId: string) {
    const { count, error } = await supabase
        .from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
    if (error) throw error;
    return (count ?? 0) < 4;
}

function formatDayLabel(date: Date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString();
}