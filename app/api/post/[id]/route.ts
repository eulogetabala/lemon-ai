import { POST_STATUS } from "@/constants/post";
import { checkMonthlyPostsLimit, resolvePlanForUserId } from "@/lib/plan-limits-server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data, error } = await supabase
            .from("scheduled_posts")
            .select("*, user_channels(*, channel_types(*))")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Post not found" }, { status: 404 });
            }
            console.error("Error fetching post:", error);
            return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
        }

        return NextResponse.json({ post: data });
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { content, images, scheduledAt, status } = await request.json();

        const { data: existing, error: existingError } = await supabase
            .from("scheduled_posts")
            .select("id, status, scheduled_at")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (existingError || !existing) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (content) updateData.content = content;
        if (Array.isArray(images)) updateData.images = images;
        if (scheduledAt) updateData.scheduled_at = scheduledAt;
        const postStatus = status === POST_STATUS.DRAFT ? POST_STATUS.DRAFT : POST_STATUS.QUEUE;
        updateData.status = postStatus;

        const becomingQueued =
            postStatus === POST_STATUS.QUEUE && existing.status !== POST_STATUS.QUEUE;
        const reschedulingIntoMonth =
            Boolean(scheduledAt) &&
            postStatus === POST_STATUS.QUEUE &&
            new Date(scheduledAt).getMonth() === new Date().getMonth() &&
            new Date(scheduledAt).getFullYear() === new Date().getFullYear() &&
            (new Date(existing.scheduled_at).getMonth() !== new Date().getMonth() ||
                new Date(existing.scheduled_at).getFullYear() !== new Date().getFullYear());

        if (becomingQueued || reschedulingIntoMonth) {
            const planId = await resolvePlanForUserId(userId);
            const limitCheck = await checkMonthlyPostsLimit(supabase, userId, planId, 1);
            if (!limitCheck.allowed) {
                return NextResponse.json(
                    {
                        error:
                            limitCheck.message ||
                            "Limite de publications atteinte pour votre forfait. Passez au forfait Pro.",
                    },
                    { status: 403 }
                );
            }
        }

        const { data, error } = await supabase
            .from("scheduled_posts")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single()

        if (error) {
            console.error("Error updating post:", error);
            return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
        }

        return NextResponse.json({ post: data });
    } catch (error) {
        console.error("Error updating post:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { error } = await supabase
            .from("scheduled_posts")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)

        if (error) {
            console.error("Error deleting post:", error);
            return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
