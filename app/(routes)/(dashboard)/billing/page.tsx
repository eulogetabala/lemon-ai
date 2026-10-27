"use client"

import { useState } from "react"
import { Check, Zap, Rocket, Building2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    <div className="mx-auto w-full max-w-[1500px]">
      <header className="relative isolate mb-7 overflow-hidden rounded-[30px] border border-[#25351f] bg-[#11190f] px-5 py-6 text-white shadow-[0_22px_60px_rgba(27,48,18,0.14)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-10 -top-28 size-80 rounded-full border border-primary/15" />
        <div aria-hidden="true" className="absolute -right-2 -top-20 size-64 rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(196,242,100,0.16),transparent_45%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#d7f99d]">Lemon, à votre rythme</p>
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
              Grandissez <span className="text-[#c4f264]">sans changer de cadence.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Des outils pour chaque étape de votre présence sociale. Changez d&apos;offre quand vous le souhaitez.
            </p>
          </div>

          <div className="shrink-0">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Facturation</p>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
              <button
                type="button"
                aria-pressed={interval === "monthly"}
                onClick={() => setInterval("monthly")}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${interval === "monthly" ? "bg-[#c4f264] text-[#17200f] shadow-sm" : "text-white/65 hover:text-white"}`}
              >
                Mensuel
              </button>
              <button
                type="button"
                aria-pressed={interval === "yearly"}
                onClick={() => setInterval("yearly")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${interval === "yearly" ? "bg-[#c4f264] text-[#17200f] shadow-sm" : "text-white/65 hover:text-white"}`}
              >
                Annuel
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-extrabold text-[#d7f99d]">−20 %</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[26px] border p-1.5 transition-all duration-300 ${
                plan.highlight
                  ? "border-primary/55 bg-primary/10 shadow-[0_20px_55px_rgba(120,170,45,0.16)]"
                  : "border-border/70 bg-card shadow-[0_14px_38px_rgba(33,52,24,0.05)] hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg"
              }`}
            >
              {/* Inner surface */}
              <div className={`flex flex-1 flex-col rounded-[22px] p-5 ${
                plan.highlight
                  ? "bg-gradient-to-b from-primary/15 via-card to-card"
                  : "bg-card"
              }`}>

              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-[#c4f264] px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#17200f] shadow-[0_8px_24px_rgba(163,230,53,0.28)]">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan icon */}
              <div className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${
                plan.highlight
                  ? "bg-primary/20 ring-1 ring-primary/35"
                  : "bg-muted ring-1 ring-border/70"
              }`}>
                <Icon className={`size-5 ${plan.highlight ? "text-accent-foreground" : "text-muted-foreground"}`} />
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
              <ul className="flex-1 space-y-3">
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
                className={`mt-6 h-11 w-full rounded-2xl text-xs font-bold`}
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
      <p className="mt-7 text-center text-xs leading-6 text-muted-foreground">
        Toutes les offres incluent un essai gratuit de 14 jours. Aucune carte bancaire requise pour commencer.
        Des questions ?{" "}
        <a href="mailto:support@lemonai.app" className="underline underline-offset-2 hover:text-foreground/60 transition-colors">
          Contacter le support
        </a>
      </p>
    </div>
  )
}
