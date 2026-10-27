import { getSupabaseServerClient } from "@/lib/supabase-server";
import { validateIdeaPayload } from "@/lib/idea-payload";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_IDEA_GROUPS = ["Unassigned", "To Do", "In Progress", "Done"];

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>["supabase"];

/**
 * Ensures the current user has at least one idea group.
 * supabase/schema.sql defines idea_groups as a per-user table but never
 * seeds it, so this lazily creates the default columns the first time a
 * user opens the ideas board. Without this, the board has no columns and
 * saving an idea fails with a 400 "Missing required fields".
 */
async function ensureDefaultIdeaGroups(supabase: ServerSupabase, userId: string) {
    const { data: existing, error: fetchError } = await supabase
        .from("idea_groups")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

    if (fetchError) return fetchError;
    if (existing && existing.length > 0) return null;

    const { error: insertError } = await supabase
        .from("idea_groups")
        .insert(DEFAULT_IDEA_GROUPS.map((name) => ({ user_id: userId, name })));

    return insertError;
}

export async function GET() {
    try {
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const seedError = await ensureDefaultIdeaGroups(supabase, userId);
        if (seedError) {
            console.error("Error seeding idea groups:", seedError);
            return NextResponse.json({ error: "Failed to fetch ideas or groups" }, { status: 500 });
        }

        const [ideasRes, groupsRes] = await Promise.all([
            supabase
                .from("ideas")
                .select("*")
                .eq("user_id", userId)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false }),
            supabase
                .from("idea_groups")
                .select("*")
                .eq("user_id", userId)  // ← added user_id filter (was missing before)
                .order("created_at", { ascending: false })
        ])

        if (ideasRes.error || groupsRes.error) {
            console.error("Error fetching ideas or groups:", ideasRes.error, groupsRes.error);
            return NextResponse.json({ error: "Failed to fetch ideas or groups" }, { status: 500 });
        }

        const ideas = ideasRes.data ?? [];
        const groups = (groupsRes.data ?? []).map((group) => ({
            id: group.id,
            title: group.name,
            ideas: ideas
                .filter((idea) => idea.group_id === group.id)
                .map((idea) => ({
                    id: idea.id,
                    title: idea.title,
                    description: idea.description,
                    images: idea.images ?? [],
                    columnId: idea.group_id,
                    sortOrder: idea.sort_order
                }))
        }))

        return NextResponse.json({ groups });

    } catch (error) {
        console.error("Error fetching ideas or groups:", error);
        return NextResponse.json({ error: "Failed to fetch ideas or groups" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, userId } = await getSupabaseServerClient();
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        let validation = validateIdeaPayload(body);

        // Self-heal: if the client sent no groupId (e.g. empty board), fall back
        // to the user's first group so saving never blocks on missing columns.
        if (!validation.ok && !validation.payload.groupId) {
            const seedError = await ensureDefaultIdeaGroups(supabase, userId);
            if (seedError) {
                console.error("Error seeding idea groups:", seedError);
                return NextResponse.json({ error: seedError.message }, { status: 500 });
            }

            const { data: groups } = await supabase
                .from("idea_groups")
                .select("id")
                .eq("user_id", userId)
                .order("created_at", { ascending: true })
                .limit(1);

            const fallbackGroupId = groups?.[0]?.id;
            if (fallbackGroupId) {
                validation = validateIdeaPayload({ ...body, groupId: fallbackGroupId });
            }
        }

        if (!validation.ok) {
            return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
        }

        const { id, title, groupId, description, images, sortOrder } = validation.payload;

        const payload = {
            user_id: userId,
            group_id: groupId,
            title,
            description,
            images,
            sort_order: typeof sortOrder === 'number' ? sortOrder : 0
        };

        let data, error;

        if (id) {
            const result = await supabase
                .from("ideas")
                .update(payload)
                .eq("id", id)
                .eq("user_id", userId)
                .select()
                .single();
            data = result.data;
            error = result.error;
        } else {
            const result = await supabase
                .from("ideas")
                .insert(payload)
                .select()
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error("Error upserting idea:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error("Error upserting idea:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
