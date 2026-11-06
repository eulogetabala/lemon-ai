export type PlanId = "free" | "pro" | "team" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPriceFCFA: number | null;
  yearlyPriceFCFA: number | null;
  maxConnectedChannels: number;
  maxCompetitors: number;
  maxScheduledPostsPerMonth: number;
  maxWorkspaces: number;
  allowAIGeneration: boolean;
  allowTeamCollaboration: boolean;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Gratuit",
    monthlyPriceFCFA: 0,
    yearlyPriceFCFA: 0,
    maxConnectedChannels: 1,
    maxCompetitors: 1,
    maxScheduledPostsPerMonth: 10,
    maxWorkspaces: 1,
    allowAIGeneration: false,
    allowTeamCollaboration: false,
    features: [
      "1 canal connecté",
      "1 concurrent sous veille",
      "10 publications planifiées/mois",
      "Analytiques de base",
      "1 espace de travail",
      "Support communautaire",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceFCFA: 12000,
    yearlyPriceFCFA: 9600,
    maxConnectedChannels: Infinity,
    maxCompetitors: Infinity,
    maxScheduledPostsPerMonth: Infinity,
    maxWorkspaces: 5,
    allowAIGeneration: true,
    allowTeamCollaboration: false,
    features: [
      "Canaux connectés illimités",
      "Veille concurrentielle illimitée",
      "Publications planifiées illimitées",
      "Analytiques et insights avancés",
      "Suggestions de contenu intelligentes",
      "5 espaces de travail",
      "Support e-mail prioritaire",
      "Vue calendrier",
      "Planification en masse",
    ],
  },
  team: {
    id: "team",
    name: "Équipe",
    monthlyPriceFCFA: 30000,
    yearlyPriceFCFA: 24000,
    maxConnectedChannels: Infinity,
    maxCompetitors: Infinity,
    maxScheduledPostsPerMonth: Infinity,
    maxWorkspaces: Infinity,
    allowAIGeneration: true,
    allowTeamCollaboration: true,
    features: [
      "Tout ce qui est inclus dans Pro",
      "Espaces de travail illimités",
      "Collaboration d'équipe et rôles",
      "Workflows d'approbation",
      "Rapports en marque blanche",
      "Liens personnalisés à votre marque",
      "Support dédié",
      "Accès API",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Entreprise",
    monthlyPriceFCFA: null,
    yearlyPriceFCFA: null,
    maxConnectedChannels: Infinity,
    maxCompetitors: Infinity,
    maxScheduledPostsPerMonth: Infinity,
    maxWorkspaces: Infinity,
    allowAIGeneration: true,
    allowTeamCollaboration: true,
    features: [
      "Tout ce qui est inclus dans Équipe",
      "SSO et SAML",
      "SLA personnalisé",
      "Gestionnaire de compte dédié",
      "Option on-premise",
      "Intégrations personnalisées",
      "SLA de disponibilité à 99,99 %",
      "Revue de sécurité",
    ],
  },
};

/**
 * Returns the active plan id based on Clerk claims or user public metadata.
 * Defaults to "free".
 */
export function getPlanFromClerkHas(
  hasOrAuth?: ((params: any) => boolean) | null | { has?: ((params: any) => boolean) | null; sessionClaims?: any },
  publicMetadata?: any
): PlanId {
  // 1. Check direct user publicMetadata (client or passed object)
  if (publicMetadata?.plan) {
    const norm = String(publicMetadata.plan).toLowerCase();
    if (norm === "enterprise") return "enterprise";
    if (norm === "team") return "team";
    if (norm === "pro" || norm === "premium") return "pro";
  }

  if (!hasOrAuth) return "free";

  // If passed an auth object { has, sessionClaims }
  if (typeof hasOrAuth === "object") {
    const claims = hasOrAuth.sessionClaims as any;
    const metaPlan =
      claims?.metadata?.plan ||
      claims?.public_metadata?.plan ||
      claims?.publicMetadata?.plan;

    if (metaPlan) {
      const norm = String(metaPlan).toLowerCase();
      if (norm === "enterprise") return "enterprise";
      if (norm === "team") return "team";
      if (norm === "pro" || norm === "premium") return "pro";
    }

    const hasFn = hasOrAuth.has;
    if (typeof hasFn === "function") {
      try {
        if (hasFn({ plan: "enterprise" })) return "enterprise";
        if (hasFn({ plan: "team" })) return "team";
        if (hasFn({ plan: "pro" }) || hasFn({ plan: "premium" })) return "pro";
      } catch {}
    }

    return "free";
  }

  // If passed a has function directly
  if (typeof hasOrAuth === "function") {
    try {
      if (hasOrAuth({ plan: "enterprise" })) return "enterprise";
      if (hasOrAuth({ plan: "team" })) return "team";
      if (hasOrAuth({ plan: "pro" }) || hasOrAuth({ plan: "premium" })) return "pro";
    } catch {}
  }

  return "free";
}

/**
 * Checks whether user can connect an additional channel according to their plan.
 */
export async function checkChannelConnectLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free"
): Promise<{ allowed: boolean; currentCount: number; maxCount: number; message?: string }> {
  const config = PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;
  if (config.maxConnectedChannels === Infinity) {
    return { allowed: true, currentCount: 0, maxCount: Infinity };
  }

  const { count, error } = await supabase
    .from("user_channels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_connected", true);

  if (error) {
    console.error("[plan-limits] checkChannelConnectLimit error:", error);
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < config.maxConnectedChannels;

  return {
    allowed,
    currentCount,
    maxCount: config.maxConnectedChannels,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait Gratuit est limité à ${config.maxConnectedChannels} canal connecté. Passez au forfait Pro pour connecter des canaux illimités.`,
  };
}

/**
 * Checks whether user can track an additional competitor according to their plan.
 */
export async function checkCompetitorLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free"
): Promise<{ allowed: boolean; currentCount: number; maxCount: number; message?: string }> {
  const config = PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;
  if (config.maxCompetitors === Infinity) {
    return { allowed: true, currentCount: 0, maxCount: Infinity };
  }

  const { count, error } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[plan-limits] checkCompetitorLimit error:", error);
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < config.maxCompetitors;

  return {
    allowed,
    currentCount,
    maxCount: config.maxCompetitors,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait Gratuit est limité à ${config.maxCompetitors} concurrent sous veille. Passez au forfait Pro pour suivre des concurrents illimités.`,
  };
}

/**
 * Checks whether user can schedule posts in the current calendar month according to their plan.
 */
export async function checkMonthlyPostsLimit(
  supabase: any,
  userId: string,
  planId: PlanId = "free",
  incomingCount: number = 1
): Promise<{ allowed: boolean; currentMonthCount: number; maxCount: number; message?: string }> {
  const config = PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;
  if (config.maxScheduledPostsPerMonth === Infinity) {
    return { allowed: true, currentMonthCount: 0, maxCount: Infinity };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const { count, error } = await supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth);

  if (error) {
    console.error("[plan-limits] checkMonthlyPostsLimit error:", error);
  }

  const currentMonthCount = count ?? 0;
  const allowed = currentMonthCount + incomingCount <= config.maxScheduledPostsPerMonth;

  return {
    allowed,
    currentMonthCount,
    maxCount: config.maxScheduledPostsPerMonth,
    message: allowed
      ? undefined
      : `Limite atteinte : le forfait Gratuit est limité à ${config.maxScheduledPostsPerMonth} publications planifiées par mois (vous en avez déjà planifié ${currentMonthCount} ce mois-ci). Passez au forfait Pro pour planifier sans limite.`,
  };
}
