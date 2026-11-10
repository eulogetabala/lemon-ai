import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  checkWorkspaceLimit,
  resolvePlanForUserId,
} from "@/lib/plan-limits-server";
import {
  ensureDefaultWorkspace,
  listUserWorkspaces,
  slugifyWorkspaceName,
} from "@/lib/workspace";

export async function GET() {
  try {
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDefaultWorkspace(supabase, userId);
    const workspaces = await listUserWorkspaces(supabase, userId);
    const planId = await resolvePlanForUserId(userId);
    const limit = await checkWorkspaceLimit(supabase, userId, planId);

    return NextResponse.json({
      workspaces,
      planId,
      usage: {
        owned: limit.currentCount,
        max: limit.maxCount,
      },
    });
  } catch (error) {
    console.error("[workspaces] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Le nom de l'espace est requis." }, { status: 400 });
    }

    const planId = await resolvePlanForUserId(userId);
    const limit = await checkWorkspaceLimit(supabase, userId, planId);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: limit.message || "Limite d'espaces de travail atteinte." },
        { status: 403 }
      );
    }

    let slug = slugifyWorkspaceName(name);
    const { data: collision } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .eq("slug", slug)
      .maybeSingle();

    if (collision) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name,
        slug,
      })
      .select("*")
      .single();

    if (error || !workspace) {
      console.error("[workspaces] create error:", error);
      return NextResponse.json({ error: "Échec de la création de l'espace." }, { status: 500 });
    }

    await supabase.from("workspace_members").upsert(
      { workspace_id: workspace.id, user_id: userId, role: "owner" },
      { onConflict: "workspace_id,user_id" }
    );

    return NextResponse.json({ workspace: { ...workspace, role: "owner" } }, { status: 201 });
  } catch (error) {
    console.error("[workspaces] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
