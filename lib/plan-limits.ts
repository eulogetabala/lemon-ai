export type PlanId = "free" | "pro" | "team" | "enterprise";
export type PlanInterval = "monthly" | "yearly";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceFCFA: number | null;
  yearlyPriceFCFA: number | null;
  maxConnectedChannels: number;
  maxCompetitors: number;
  maxScheduledPostsPerMonth: number;
  maxWorkspaces: number;
  allowAIGeneration: boolean;
  allowTeamCollaboration: boolean;
  features: string[];
  highlight?: boolean;
  badge?: string | null;
  cta: string;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Gratuit",
    description: "Idéal pour démarrer avec la planification sur les réseaux sociaux.",
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
    highlight: false,
    badge: null,
    cta: "Offre actuelle",
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Pour les créateurs et solopreneurs qui publient régulièrement.",
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
    highlight: true,
    badge: "Le plus populaire",
    cta: "Passer à Pro",
  },
  team: {
    id: "team",
    name: "Équipe",
    description: "Pour les équipes en croissance qui gèrent plusieurs marques.",
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
    highlight: false,
    badge: null,
    cta: "Passer à Équipe",
  },
  enterprise: {
    id: "enterprise",
    name: "Entreprise",
    description: "Solutions sur mesure pour les grandes organisations.",
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
    highlight: false,
    badge: null,
    cta: "Contacter l'équipe",
  },
};

export const PAID_CHECKOUT_PLANS: PlanId[] = ["pro", "team"];

export type PlanMetadata = {
  plan?: string | null;
  planInterval?: string | null;
  planExpiresAt?: string | null;
  sebpayLastPaymentRef?: string | null;
};

function normalizePlanId(raw?: string | null): PlanId | null {
  if (!raw) return null;
  const norm = String(raw).toLowerCase().trim();
  if (norm === "enterprise") return "enterprise";
  if (norm === "team" || norm === "business") return "team";
  if (norm === "pro" || norm === "premium") return "pro";
  if (norm === "free") return "free";
  return null;
}

function isPlanExpired(planExpiresAt?: string | null): boolean {
  if (!planExpiresAt) return false;
  const expires = Date.parse(planExpiresAt);
  if (Number.isNaN(expires)) return false;
  return expires < Date.now();
}

/**
 * Resolve plan from Clerk public metadata (and optional expiry).
 * Expired paid plans fall back to free.
 */
export function resolvePlanFromMetadata(publicMetadata?: PlanMetadata | null): PlanId {
  const planId = normalizePlanId(publicMetadata?.plan);
  if (!planId || planId === "free") return "free";
  if (planId === "enterprise") return "enterprise";
  if (isPlanExpired(publicMetadata?.planExpiresAt)) return "free";
  return planId;
}

export function getPlanConfig(planId: PlanId = "free"): PlanConfig {
  return PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;
}

export function canUseAI(planId: PlanId): boolean {
  return getPlanConfig(planId).allowAIGeneration;
}

export function canCollaborate(planId: PlanId): boolean {
  return getPlanConfig(planId).allowTeamCollaboration;
}

/**
 * Legacy helper kept for compatibility. Prefer resolvePlanFromMetadata / resolvePlanForUserId.
 */
export function getPlanFromClerkHas(
  hasOrAuth?: ((params: any) => boolean) | null | { has?: ((params: any) => boolean) | null; sessionClaims?: any },
  publicMetadata?: any
): PlanId {
  const fromMeta = resolvePlanFromMetadata(publicMetadata);
  if (publicMetadata?.plan && fromMeta !== "free") return fromMeta;
  if (publicMetadata?.plan === "free") return "free";

  if (!hasOrAuth) return fromMeta;

  if (typeof hasOrAuth === "object") {
    const claims = hasOrAuth.sessionClaims as any;
    const metaPlan =
      claims?.metadata?.plan ||
      claims?.public_metadata?.plan ||
      claims?.publicMetadata?.plan;
    const expiresAt =
      claims?.metadata?.planExpiresAt ||
      claims?.public_metadata?.planExpiresAt ||
      claims?.publicMetadata?.planExpiresAt;

    const fromClaims = resolvePlanFromMetadata({ plan: metaPlan, planExpiresAt: expiresAt });
    if (metaPlan) return fromClaims;

    const hasFn = hasOrAuth.has;
    if (typeof hasFn === "function") {
      try {
        if (hasFn({ plan: "enterprise" })) return "enterprise";
        if (hasFn({ plan: "team" }) || hasFn({ plan: "business" })) return "team";
        if (hasFn({ plan: "pro" }) || hasFn({ plan: "premium" })) return "pro";
      } catch {}
    }

    return "free";
  }

  if (typeof hasOrAuth === "function") {
    try {
      if (hasOrAuth({ plan: "enterprise" })) return "enterprise";
      if (hasOrAuth({ plan: "team" }) || hasOrAuth({ plan: "business" })) return "team";
      if (hasOrAuth({ plan: "pro" }) || hasOrAuth({ plan: "premium" })) return "pro";
    } catch {}
  }

  return "free";
}

export function computePlanExpiry(interval: PlanInterval, from: Date = new Date()): string {
  const d = new Date(from);
  if (interval === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setDate(d.getDate() + 30);
  }
  return d.toISOString();
}

export function getCheckoutAmountFCFA(planId: PlanId, interval: PlanInterval): number | null {
  const config = getPlanConfig(planId);
  if (config.monthlyPriceFCFA == null) return null;
  if (config.monthlyPriceFCFA === 0) return 0;
  if (interval === "yearly") {
    return (config.yearlyPriceFCFA ?? Math.round(config.monthlyPriceFCFA * 0.8)) * 12;
  }
  return config.monthlyPriceFCFA;
}
