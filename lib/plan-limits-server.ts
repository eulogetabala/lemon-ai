import {
  getPlanConfig,
  resolvePlanFromMetadata,
  getPlanFromClerkHas,
  type PlanId,
  type PlanMetadata,
} from "./plan-limits.ts";

export type LimitResult = {
  allowed: boolean;
  currentCount: number;
  maxCount: number;
  message?: string;
};

/**
 * Server-side plan resolution via Clerk Backend API (works in OAuth callbacks and background routes).
 */
export async function resolvePlanForUserId(userId: string): Promise<PlanId> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return resolvePlanFromMetadata(user.publicMetadata as PlanMetadata);
  } catch (error) {
    console.error("[plan-limits-server] resolvePlanForUserId error:", error);
    return "free";
  }
}

export async function resolvePlanFromAuth(authResult: {
  userId?: string | null;
  has?: ((params: any) => boolean) | null;
  sessionClaims?: any;
}): Promise<PlanId> {
  if (authResult.userId) {
    return resolvePlanForUserId(authResult.userId);
  }
  return getPlanFromClerkHas(
    { has: authResult.has, sessionClaims: authResult.sessionClaims },
    authResult.sessionClaims?.publicMetadata || authResult.sessionClaims?.metadata
  );
}

export async function checkChannelConnectLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free",
  workspaceId?: string | null
): Promise<LimitResult> {
  const config = getPlanConfig(planId);
  if (config.maxConnectedChannels === Infinity) {
    return { allowed: true, currentCount: 0, maxCount: Infinity };
  }

  let query = supabase
    .from("user_channels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_connected", true);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[plan-limits-server] checkChannelConnectLimit error:", error);
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < config.maxConnectedChannels;

  return {
    allowed,
    currentCount,
    maxCount: config.maxConnectedChannels,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait ${config.name} est limité à ${config.maxConnectedChannels} canal connecté. Passez au forfait Pro pour connecter des canaux illimités.`,
  };
}

export async function checkCompetitorLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free",
  workspaceId?: string | null
): Promise<LimitResult> {
  const config = getPlanConfig(planId);
  if (config.maxCompetitors === Infinity) {
    return { allowed: true, currentCount: 0, maxCount: Infinity };
  }

  let query = supabase
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[plan-limits-server] checkCompetitorLimit error:", error);
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < config.maxCompetitors;

  return {
    allowed,
    currentCount,
    maxCount: config.maxCompetitors,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait ${config.name} est limité à ${config.maxCompetitors} concurrent sous veille. Passez au forfait Pro pour suivre des concurrents illimités.`,
  };
}

export async function checkMonthlyPostsLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free",
  incomingCount: number = 1,
  workspaceId?: string | null
): Promise<{ allowed: boolean; currentMonthCount: number; maxCount: number; message?: string }> {
  const config = getPlanConfig(planId);
  if (config.maxScheduledPostsPerMonth === Infinity) {
    return { allowed: true, currentMonthCount: 0, maxCount: Infinity };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  let query = supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[plan-limits-server] checkMonthlyPostsLimit error:", error);
  }

  const currentMonthCount = count ?? 0;
  const allowed = currentMonthCount + incomingCount <= config.maxScheduledPostsPerMonth;

  return {
    allowed,
    currentMonthCount,
    maxCount: config.maxScheduledPostsPerMonth,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait ${config.name} est limité à ${config.maxScheduledPostsPerMonth} publications planifiées par mois (vous en avez déjà planifié ${currentMonthCount} ce mois-ci). Passez au forfait Pro pour planifier sans limite.`,
  };
}

export async function checkWorkspaceLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free"
): Promise<LimitResult> {
  const config = getPlanConfig(planId);
  if (config.maxWorkspaces === Infinity) {
    return { allowed: true, currentCount: 0, maxCount: Infinity };
  }

  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) {
    console.error("[plan-limits-server] checkWorkspaceLimit error:", error);
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < config.maxWorkspaces;

  return {
    allowed,
    currentCount,
    maxCount: config.maxWorkspaces,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait ${config.name} est limité à ${config.maxWorkspaces} espace${config.maxWorkspaces > 1 ? "s" : ""} de travail. Passez à une offre supérieure pour en créer davantage.`,
  };
}
