"use client"

import { useState } from "react"
import { Check, Zap, Rocket, Building2, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
    <div className="w-full max-w-5xl px-4 py-6 mx-auto">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-1.5 text-foreground">
          Facturation et offres
        </h1>
        <p className="text-sm text-foreground/45 max-w-md mx-auto">
          Choisissez l’offre adaptée à vos besoins. Passez à une offre supérieure, inférieure ou annulez à tout moment.
        </p>

        {/* Interval toggle */}
        <div className="mt-6 inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              interval === "monthly"
                ? "bg-foreground text-background shadow-sm"
                : "text-foreground/45 hover:text-foreground/70"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              interval === "yearly"
                ? "bg-foreground text-background shadow-sm"
                : "text-foreground/45 hover:text-foreground/70"
            }`}
          >
            Annuel
            <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
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
              className={`relative flex flex-col rounded-2xl border p-1 transition-all duration-300 ${
                plan.highlight
                  ? "border-primary/40 glow-lime animate-border-glow"
                  : "border-white/[0.08] hover:-translate-y-1"
              }`}
            >
              {/* Inner surface */}
              <div className={`flex flex-col flex-1 rounded-xl p-5 ${
                plan.highlight
                  ? "bg-gradient-to-b from-primary/[0.07] to-transparent"
                  : "dark:bg-[#0d1526]/60 bg-card"
              }`}>

              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-[0_0_12px_rgba(163,230,53,0.4)]">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                plan.highlight
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : "bg-white/[0.05] ring-1 ring-white/[0.08]"
              }`}>
                <Icon className={`size-5 ${plan.highlight ? "text-primary" : "text-foreground/40"}`} />
              </div>

              <h3 className="text-sm font-bold tracking-tight text-foreground/90">{plan.name}</h3>
              <p className="text-xs text-foreground/40 mt-1 leading-relaxed">{plan.description}</p>

              {/* Price */}
              <div className="mt-5 mb-5">
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${
                    plan.highlight ? "text-gradient-lime-simple" : "text-foreground/90"
                  }`}>
                    {displayPrice(plan)}
                  </span>
                  {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                    <span className="text-foreground/35 text-xs mb-1.5">/mois</span>
                  )}
                </div>
                {interval === "yearly" && plan.yearlyPrice && plan.yearlyPrice > 0 && (
                  <p className="text-[10px] text-foreground/35 mt-0.5">
                    Facturé {plan.yearlyPrice * 12} $/an
                  </p>
                )}
                {plan.monthlyPrice === null && (
                  <p className="text-[10px] text-foreground/35 mt-0.5">Adapté à vos besoins</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 size-4 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="size-2.5 text-primary" />
                    </div>
                    <span className="text-foreground/55 leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full mt-5 rounded-full h-9 text-xs font-semibold`}
                variant={plan.highlight ? "default" : "outline"}
                disabled={plan.disabled}
                onClick={() => {
                  if (plan.id === "enterprise") {
                    window.open("mailto:sales@lemonai.app", "_blank")
                  }
                }}
              >
                {plan.cta}
              </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-foreground/30 mt-8">
        Toutes les offres incluent un essai gratuit de 14 jours. Aucune carte bancaire requise pour commencer.
        Des questions ?{" "}
        <a href="mailto:support@lemonai.app" className="underline underline-offset-2 hover:text-foreground/60 transition-colors">
          Contacter le support
        </a>
      </p>
    </div>
  )
}
