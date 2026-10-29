"use client"

import { useState } from "react"
import { Check, Zap, Rocket, Building2, Star, CreditCard, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BillingInterval = "monthly" | "yearly"

const plans = [
  {
    id: "free",
    name: "Gratuit",
    icon: Star,
    description: "Idéal pour démarrer avec la planification sur les réseaux sociaux.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    highlight: false,
    cta: "Offre actuelle",
    disabled: true,
    features: [
      "3 canaux connectés",
      "10 publications planifiées/mois",
      "Analytiques de base",
      "1 espace de travail",
      "Support communautaire",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    description: "Pour les créateurs et solopreneurs qui publient régulièrement.",
    monthlyPrice: 19,
    yearlyPrice: 15,
    badge: "Le plus populaire",
    highlight: true,
    cta: "Passer à Pro",
    disabled: false,
    features: [
      "Canaux connectés illimités",
      "Publications planifiées illimitées",
      "Analytiques et insights avancés",
      "Suggestions de contenu IA",
      "5 espaces de travail",
      "Support e-mail prioritaire",
      "Vue calendrier",
      "Planification en masse",
    ],
  },
  {
    id: "team",
    name: "Équipe",
    icon: Rocket,
    description: "Pour les équipes en croissance qui gèrent plusieurs marques.",
    monthlyPrice: 49,
    yearlyPrice: 39,
    badge: null,
    highlight: false,
    cta: "Passer à Équipe",
    disabled: false,
    features: [
      "Tout ce qui est inclus dans Pro",
      "Espaces de travail illimités",
      "Collaboration d'équipe et rôles",
      "Workflows d'approbation",
      "Rapports en marque blanche",
      "Liens personnalisés à votre marque",
      "Support Slack dédié",
      "Accès API",
    ],
  },
  {
    id: "enterprise",
    name: "Entreprise",
    icon: Building2,
    description: "Solutions sur mesure pour les grandes organisations.",
    monthlyPrice: null,
    yearlyPrice: null,
    badge: null,
    highlight: false,
    cta: "Contacter les ventes",
    disabled: false,
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
]

export default function BillingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")

  const displayPrice = (plan: (typeof plans)[0]) => {
    if (plan.monthlyPrice === null) return "Sur mesure"
    if (plan.monthlyPrice === 0) return "0 $"
    const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
    return `${price} $`
  }

  return (
    <div className="w-full max-w-5xl px-2 py-4 mx-auto">
      {/* Header — Studio Editorial */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white dark:bg-mist/10 px-3.5 py-1.5 mb-5">
          <CreditCard className="size-3.5 text-moss" />
          <span className="tag-code text-mute">Facturation & offres</span>
        </div>

        <h1 className="text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-[-0.035em] text-ink leading-[1.1]">
          Choisissez votre <span className="hi-swipe px-1.5">offre</span>
        </h1>
        <p className="text-[15px] text-mute max-w-lg mx-auto mt-3 leading-relaxed">
          Passez à une offre supérieure, inférieure ou annulez à tout moment.
          Pas d'engagement, pas de surprise.
        </p>

        {/* Interval toggle — pill style matching landing */}
        <div className="mt-7 inline-flex items-center gap-0.5 rounded-full border border-hairline bg-mist/50 p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold transition-all duration-200",
              interval === "monthly"
                ? "bg-ink text-lemon shadow-sm"
                : "text-mute hover:text-ink"
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2",
              interval === "yearly"
                ? "bg-ink text-lemon shadow-sm"
                : "text-mute hover:text-ink"
            )}
          >
            Annuel
            <span className="tag-code bg-lemon text-ink rounded-full px-2 py-0.5">
              –20 %
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border transition-all duration-300",
                plan.highlight
                  ? "border-lemon/50 shadow-[0_16px_40px_-12px_rgba(198,255,26,0.2)]"
                  : "border-hairline hover:-translate-y-1 hover:border-lemon/20 hover:shadow-[0_12px_32px_-10px_rgba(198,255,26,0.1)]"
              )}
            >
              {/* Inner surface */}
              <div className={cn(
                "flex flex-col flex-1 rounded-2xl p-6",
                plan.highlight
                  ? "bg-white dark:bg-card"
                  : "bg-white dark:bg-card"
              )}>

              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center rounded-full bg-lemon px-3 py-1 tag-code text-ink lime-glow">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan icon */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 border",
                plan.highlight
                  ? "bg-lemon/15 border-lemon/25"
                  : "bg-mist/50 border-hairline"
              )}>
                <Icon className={cn(
                  "size-5",
                  plan.highlight ? "text-moss" : "text-mute"
                )} />
              </div>

              <h3 className="text-sm font-extrabold tracking-tight text-ink">{plan.name}</h3>
              <p className="text-xs text-mute mt-1 leading-relaxed">{plan.description}</p>

              {/* Price */}
              <div className="mt-5 mb-5">
                <div className="flex items-end gap-1">
                  <span className={cn(
                    "text-4xl font-extrabold tracking-tight",
                    plan.highlight ? "text-moss" : "text-ink"
                  )}>
                    {displayPrice(plan)}
                  </span>
                  {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                    <span className="text-mute text-xs mb-1.5 font-medium">/mois</span>
                  )}
                </div>
                {interval === "yearly" && plan.yearlyPrice && plan.yearlyPrice > 0 && (
                  <p className="tag-code text-mute mt-1">
                    Facturé {plan.yearlyPrice * 12} $/an
                  </p>
                )}
                {plan.monthlyPrice === null && (
                  <p className="tag-code text-mute mt-1">Adapté à vos besoins</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-xs">
                    <div className={cn(
                      "mt-0.5 size-4 shrink-0 rounded-full flex items-center justify-center",
                      plan.highlight ? "bg-lemon/20" : "bg-mist"
                    )}>
                      <Check className={cn(
                        "size-2.5",
                        plan.highlight ? "text-moss" : "text-mute"
                      )} />
                    </div>
                    <span className="text-ink/70 leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  "w-full mt-6 rounded-full h-10 text-xs font-bold transition-all duration-200 gap-1.5",
                  plan.highlight
                    ? "bg-lemon text-ink hover:bg-lemon/90 shadow-[0_6px_20px_-4px_rgba(198,255,26,0.4)] hover:-translate-y-0.5"
                    : plan.disabled
                      ? "bg-mist text-mute cursor-not-allowed"
                      : "bg-ink text-lemon hover:bg-ink/90"
                )}
                disabled={plan.disabled}
                onClick={() => {
                  if (plan.id === "enterprise") {
                    window.open("mailto:sales@lemonai.app", "_blank")
                  }
                }}
              >
                {plan.cta}
                {!plan.disabled && <ArrowRight className="size-3.5" />}
              </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-mute mt-10">
        Toutes les offres incluent un essai gratuit de 14 jours. Aucune carte bancaire requise pour commencer.
        Des questions ?{" "}
        <a href="mailto:support@lemonai.app" className="underline underline-offset-2 hover:text-moss transition-colors font-semibold">
          Contacter le support
        </a>
      </p>
    </div>
  )
}
