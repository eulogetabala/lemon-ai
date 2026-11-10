import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireWorkspaceAccess, slugifyWorkspaceName } from "@/lib/workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace, membership } = await requireWorkspaceAccess(supabase, id, userId, "viewer");
    return NextResponse.json({ workspace: { ...workspace, role: membership.role } });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
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

    await requireWorkspaceAccess(supabase, id, userId, "admin");

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("workspaces")
      .update({
        name,
        slug: slugifyWorkspaceName(name),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Échec de la mise à jour." }, { status: 500 });
    }

    return NextResponse.json({ workspace: data });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace } = await requireWorkspaceAccess(supabase, id, userId, "owner");

    if (workspace.slug === "principal" && workspace.owner_id === userId) {
      return NextResponse.json(
        { error: "L'espace Principal ne peut pas être supprimé." },
        { status: 400 }
      );
    }

    if (workspace.owner_id !== userId) {
      return NextResponse.json({ error: "Seul le propriétaire peut supprimer cet espace." }, { status: 403 });
    }

    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
  }
}
