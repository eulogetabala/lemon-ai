import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveWorkspace, WORKSPACE_COOKIE, type Workspace, type WorkspaceRole } from "@/lib/workspace";

export async function getWorkspaceFromRequest(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
  explicitId?: string | null
): Promise<Workspace & { role: WorkspaceRole }> {
  const headerId = request.headers.get("x-workspace-id");
  const cookieId = request.cookies.get(WORKSPACE_COOKIE)?.value;
  const queryId = request.nextUrl.searchParams.get("workspaceId");
  return resolveActiveWorkspace(supabase, userId, explicitId || headerId || queryId || cookieId || null);
}
