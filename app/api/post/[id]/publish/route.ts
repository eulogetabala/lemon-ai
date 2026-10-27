import { inngest } from "@/inngest/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: post, error: postError } = await supabase
            .from("scheduled_posts")
            .select("id, status")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (postError || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
        if (post.status === "published") return NextResponse.json({ error: "Post already published" }, { status: 400 });

        const { error: updateError } = await supabase
            .from("scheduled_posts")
            .update({ status: "queue", scheduled_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", userId);

        if (updateError) {
            console.error("Publish route: failed to queue post", updateError);
            return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
        }

        try {
            await inngest.send({ name: "post/publish.requested", data: { postId: id } });
        } catch (sendError) {
            const message = sendError instanceof Error ? sendError.message : String(sendError);
            console.error("Publish route: Inngest send failed", sendError);
            return NextResponse.json(
                { error: "Le service de publication n'est pas disponible. Vérifiez que le serveur Inngest est démarré (npm run dev:inngest).", detail: message },
                { status: 503 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Publish route: unexpected error", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
