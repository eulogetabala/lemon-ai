import type { SupabaseClient } from "@supabase/supabase-js";
import { canCollaborate, type PlanId } from "@/lib/plan-limits";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import {
  WORKSPACE_COOKIE,
  type WorkspaceRole,
  type Workspace,
  type WorkspaceMember,
  roleAtLeast,
  slugifyWorkspaceName,
} from "./workspace-types";

export * from "./workspace-types";

function getFallbackWorkspace(userId: string): Workspace {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    owner_id: userId,
    name: "Principal",
    slug: "principal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    String(error.message || "").toLowerCase().includes("could not find the table")
  );
}

/**
 * Workspace bookkeeping tables (workspaces, workspace_members) are queried with
 * the service-role client: the per-user client is subject to RLS and those
 * tables have no policies for the Clerk JWT, which made every lookup/insert fail
 * and silently fall back to a fake workspace id (so channels "disappeared").
 * Every query below filters by userId explicitly.
 */
function workspaceDb(fallback: SupabaseClient): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fallback;
  try {
    return getSupabaseAdminClient();
  } catch {
    return fallback;
  }
}

const ORPHAN_TABLES = ["user_channels", "scheduled_posts", "idea_groups", "ideas", "competitors"] as const;
const adoptedUsers = new Set<string>();

/**
 * Attach rows created before workspaces existed (workspace_id IS NULL) to the
 * user's default workspace. Runs once per user per server process.
 */
export async function adoptOrphanRows(userId: string, workspaceId: string, client?: SupabaseClient) {
  const key = `${userId}:${workspaceId}`;
  if (adoptedUsers.has(key)) return;
  const db = client ? workspaceDb(client) : getSupabaseAdminClient();
  for (const table of ORPHAN_TABLES) {
    try {
      const { error } = await db
        .from(table)
        .update({ workspace_id: workspaceId })
        .eq("user_id", userId)
        .is("workspace_id", null);
      if (error && !isTableMissingError(error)) {
        console.warn(`[adoptOrphanRows] ${table}:`, error.message);
      }
    } catch {}
  }
  adoptedUsers.add(key);
}

/**
 * Ensure the user has at least one workspace (Principal) and is owner member.
 */
export async function ensureDefaultWorkspace(
  client: SupabaseClient,
  userId: string
): Promise<Workspace> {
  const supabase = workspaceDb(client);
  try {
    const { data: existing, error: selectErr } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (isTableMissingError(selectErr)) {
      return getFallbackWorkspace(userId);
    }

    if (existing) {
      try {
        await supabase
          .from("workspace_members")
          .upsert(
            { workspace_id: existing.id, user_id: userId, role: "owner" },
            { onConflict: "workspace_id,user_id" }
          );
      } catch {}
      return existing as Workspace;
    }

    const { data: created, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: "Principal",
        slug: "principal",
      })
      .select("*")
      .single();

    if (error || !created) {
      if (isTableMissingError(error)) {
        return getFallbackWorkspace(userId);
      }
      console.warn("[ensureDefaultWorkspace] warning:", error?.message);
      return getFallbackWorkspace(userId);
    }

    try {
      await supabase
        .from("workspace_members")
        .upsert(
          { workspace_id: created.id, user_id: userId, role: "owner" },
          { onConflict: "workspace_id,user_id" }
        );
    } catch {}

    return created as Workspace;
  } catch (err) {
    console.warn("[ensureDefaultWorkspace] Fallback triggered:", err);
    return getFallbackWorkspace(userId);
  }
}

export async function listUserWorkspaces(
  client: SupabaseClient,
  userId: string
): Promise<Array<Workspace & { role: WorkspaceRole }>> {
  const supabase = workspaceDb(client);
  try {
    const fallback = getFallbackWorkspace(userId);
    const { data: memberships, error } = await supabase
      .from("workspace_members")
      .select("role, workspaces(*)")
      .eq("user_id", userId);

    if (error) {
      if (isTableMissingError(error)) {
        return [{ ...fallback, role: "owner" }];
      }
      return [{ ...fallback, role: "owner" }];
    }

    const list = (memberships || [])
      .map((row: any) => {
        const ws = row.workspaces as Workspace | null;
        if (!ws) return null;
        return { ...ws, role: row.role as WorkspaceRole };
      })
      .filter(Boolean) as Array<Workspace & { role: WorkspaceRole }>;

    if (list.length === 0) {
      const defaultWs = await ensureDefaultWorkspace(supabase, userId);
      return [{ ...defaultWs, role: "owner" }];
    }

    return list;
  } catch {
    return [{ ...getFallbackWorkspace(userId), role: "owner" }];
  }
}

export async function getMembership(
  client: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const supabase = workspaceDb(client);
  try {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (isTableMissingError(error)) {
      return {
        id: "m-fallback",
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      };
    }
    return (data as WorkspaceMember) || null;
  } catch {
    return null;
  }
}

export async function requireWorkspaceAccess(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  minimumRole: WorkspaceRole = "viewer"
): Promise<{ workspace: Workspace; membership: WorkspaceMember }> {
  const supabase = workspaceDb(client);
  try {
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (isTableMissingError(error)) {
      const fb = getFallbackWorkspace(userId);
      return {
        workspace: fb,
        membership: {
          id: "m-fallback",
          workspace_id: fb.id,
          user_id: userId,
          role: "owner",
          created_at: new Date().toISOString(),
        },
      };
    }

    if (error || !workspace) {
      throw Object.assign(new Error("Espace de travail introuvable"), { status: 404 });
    }

    const membership = await getMembership(supabase, workspaceId, userId);
    if (!membership || !roleAtLeast(membership.role, minimumRole)) {
      throw Object.assign(new Error("Accès refusé à cet espace de travail"), { status: 403 });
    }

    return { workspace: workspace as Workspace, membership };
  } catch (err: any) {
    if (err?.status) throw err;
    const fb = getFallbackWorkspace(userId);
    return {
      workspace: fb,
      membership: {
        id: "m-fallback",
        workspace_id: fb.id,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      },
    };
  }
}

/**
 * Resolve active workspace from cookie / header, falling back to default.
 */
export async function resolveActiveWorkspace(
  client: SupabaseClient,
  userId: string,
  preferredId?: string | null
): Promise<Workspace & { role: WorkspaceRole }> {
  const supabase = workspaceDb(client);
  const workspaces = await listUserWorkspaces(supabase, userId);

  // Legacy rows (created before workspaces, or by a code path that forgot
  // workspace_id) belong to the user's default "Principal" workspace.
  const principal =
    workspaces.find((w) => w.owner_id === userId && w.slug === "principal") ??
    workspaces.find((w) => w.owner_id === userId);
  if (principal && principal.id !== getFallbackWorkspace(userId).id) {
    await adoptOrphanRows(userId, principal.id, client);
  }

  if (workspaces.length === 0) {
    const created = await ensureDefaultWorkspace(supabase, userId);
    return { ...created, role: "owner" };
  }

  if (preferredId) {
    const match = workspaces.find((w) => w.id === preferredId);
    if (match) return match;
  }

  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const cookieId = jar.get(WORKSPACE_COOKIE)?.value;
    if (cookieId) {
      const match = workspaces.find((w) => w.id === cookieId);
      if (match) return match;
    }
  } catch {
    // cookies() may throw outside request context
  }

  return workspaces[0];
}

export function assertCanInvite(planId: PlanId, role: WorkspaceRole) {
  if (!canCollaborate(planId)) {
    throw Object.assign(
      new Error("La collaboration d'équipe nécessite le forfait Équipe ou Entreprise."),
      { status: 403 }
    );
  }
  if (!roleAtLeast(role, "admin")) {
    throw Object.assign(new Error("Seuls les administrateurs peuvent inviter des collaborateurs."), {
      status: 403,
    });
  }
}
