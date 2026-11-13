import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireWorkspaceAccess, roleAtLeast } from "@/lib/workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceAccess(supabase, id, userId, "viewer");

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Impossible de charger les membres." }, { status: 500 });
    }

    const client = await clerkClient();
    const enriched = await Promise.all(
      (members || []).map(async (m) => {
        try {
          const user = await client.users.getUser(m.user_id);
          return {
            ...m,
            name:
              user.fullName ||
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.username ||
              "Membre",
            email: user.primaryEmailAddress?.emailAddress || null,
            imageUrl: user.imageUrl || null,
          };
        } catch {
          return {
            ...m,
            name: "Membre",
            email: null,
            imageUrl: null,
          };
        }
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
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

    const { membership } = await requireWorkspaceAccess(supabase, id, userId, "admin");
    const body = await request.json().catch(() => ({}));
    const memberUserId = typeof body?.userId === "string" ? body.userId : "";
    if (!memberUserId) {
      return NextResponse.json({ error: "userId requis." }, { status: 400 });
    }

    if (memberUserId === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous retirer vous-même." }, { status: 400 });
    }

    const target = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", id)
      .eq("user_id", memberUserId)
      .maybeSingle();

    if (!target.data) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }

    if (target.data.role === "owner") {
      return NextResponse.json({ error: "Le propriétaire ne peut pas être retiré." }, { status: 400 });
    }

    if (target.data.role === "admin" && !roleAtLeast(membership.role, "owner")) {
      return NextResponse.json({ error: "Seul le propriétaire peut retirer un admin." }, { status: 403 });
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", id)
      .eq("user_id", memberUserId);

    if (error) {
      return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
  }
}
