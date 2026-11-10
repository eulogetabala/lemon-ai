import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolvePlanForUserId } from "@/lib/plan-limits-server";
import { assertCanInvite, requireWorkspaceAccess, type WorkspaceRole } from "@/lib/workspace";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceAccess(supabase, id, userId, "admin");

    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Impossible de charger les invitations." }, { status: 500 });
    }

    return NextResponse.json({ invitations: data || [] });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { membership } = await requireWorkspaceAccess(supabase, id, userId, "admin");
    const planId = await resolvePlanForUserId(userId);
    assertCanInvite(planId, membership.role);

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = (typeof body?.role === "string" ? body.role : "editor") as WorkspaceRole;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
    }
    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: id,
        email,
        role,
        token,
        status: "pending",
        invited_by: userId,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[invitations] create error:", error);
      return NextResponse.json({ error: "Échec de la création de l'invitation." }, { status: 500 });
    }

    const inviteUrl = `${APP_URL.replace(/\/+$/, "")}/invite/${token}`;

    return NextResponse.json(
      {
        invitation: data,
        inviteUrl,
        // Email delivery can be wired to a provider later; the shareable link is the source of truth.
        message: "Invitation créée. Partagez le lien avec le collaborateur.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Erreur" }, { status });
  }
}
