import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: invitation } = await supabase
      .from("workspace_invitations")
      .select("*, workspaces(id, name)")
      .eq("token", token)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Cette invitation n'est plus valide.", invitation }, { status: 410 });
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return NextResponse.json({ error: "Invitation expirée." }, { status: 410 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        workspace: invitation.workspaces,
      },
    });
  } catch (error) {
    console.error("[invite] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { userId } = await getSupabaseServerClient();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdminClient();
    const { data: invitation } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation invalide." }, { status: 404 });
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return NextResponse.json({ error: "Invitation expirée." }, { status: 410 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
    if (!emails.includes(String(invitation.email).toLowerCase())) {
      return NextResponse.json(
        {
          error: `Connectez-vous avec l'adresse ${invitation.email} pour accepter cette invitation.`,
        },
        { status: 403 }
      );
    }

    await supabase.from("workspace_members").upsert(
      {
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
      },
      { onConflict: "workspace_id,user_id" }
    );

    await supabase
      .from("workspace_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return NextResponse.json({
      success: true,
      workspaceId: invitation.workspace_id,
    });
  } catch (error) {
    console.error("[invite] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
