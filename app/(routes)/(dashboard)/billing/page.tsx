"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Zap,
  Users,
  Building2,
  Layers,
  CreditCard,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAN_CONFIGS, type PlanId, type PlanInterval } from "@/lib/plan-limits";

const PLAN_ICONS: Record<PlanId, any> = {
  free: Layers,
  pro: Zap,
  team: Users,
  enterprise: Building2,
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [interval, setInterval] = useState<PlanInterval>("monthly");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current user billing status
  const { data: billingData } = useQuery({
    queryKey: ["billing-payments"],
    queryFn: async () => {
      const res = await fetch("/api/billing/payments");
      return res.json();
    },
  });

  const currentPlanId: PlanId = billingData?.plan || "free";

  const handleCheckout = (planId: PlanId) => {
    if (planId === "enterprise") {
      window.open("mailto:contact@korapulse.com", "_blank");
      return;
    }
    if (planId === "free") {
      return;
    }

    router.push(`/billing/checkout?plan=${planId}&interval=${interval}`);
  };

  const planList = [
    PLAN_CONFIGS.free,
    PLAN_CONFIGS.pro,
    PLAN_CONFIGS.team,
    PLAN_CONFIGS.enterprise,
  ];

  return (
    <div className="w-full max-w-5xl px-2 py-4 mx-auto">
      {/* Notifications / Alerts */}
      {paymentStatus === "success" && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/20 p-4 flex items-center gap-3 text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Paiement validé avec succès !</span> Votre abonnement est désormais actif.
          </div>
        </div>
      )}

      {paymentStatus === "pending" && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200">
          <AlertCircle className="size-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Paiement en cours de traitement.</span> Sebpay finalise la transaction.
          </div>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-50/80 dark:bg-red-950/20 p-4 flex items-center gap-3 text-red-900 dark:text-red-200">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Échec du paiement.</span> La transaction a été interrompue ou rejetée. Veuillez réessayer.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-50/80 dark:bg-red-950/20 p-4 flex items-center gap-3 text-red-900 dark:text-red-200">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <div className="text-xs font-semibold">{errorMessage}</div>
        </div>
      )}

      {/* Header — Studio Editorial */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white dark:bg-mist/10 px-3.5 py-1.5 mb-5">
          <CreditCard className="size-3.5 text-moss" />
          <span className="tag-code text-mute">Facturation & offres Sebpay</span>
        </div>

        <h1 className="text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-[-0.035em] text-ink leading-[1.1]">
          Choisissez votre <span className="hi-swipe px-1.5">offre</span>
        </h1>
        <p className="text-[15px] text-mute max-w-lg mx-auto mt-3 leading-relaxed">
          Paiement sécurisé en FCFA par Mobile Money (MTN, Moov, Orange, Wave) ou carte bancaire via Sebpay.
        </p>

        {/* Interval toggle */}
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
            <span className="tag-code bg-lemon text-white font-bold rounded-full px-2 py-0.5">
              –20 %
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {planList.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Layers;
          const isCurrent = currentPlanId === plan.id;

          let displayPriceStr = "Sur mesure";
          if (plan.monthlyPriceFCFA === 0) {
            displayPriceStr = "0 FCFA";
          } else if (plan.monthlyPriceFCFA !== null) {
            const price =
              interval === "yearly"
                ? (plan.yearlyPriceFCFA ?? Math.round(plan.monthlyPriceFCFA * 0.8))
                : plan.monthlyPriceFCFA;
            displayPriceStr = `${price.toLocaleString("fr-FR")} FCFA`;
          }

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border transition-all duration-300",
                plan.highlight
                  ? "border-lemon/50 shadow-[0_16px_40px_-12px_rgba(255,87,34,0.2)]"
                  : "border-hairline hover:-translate-y-1 hover:border-lemon/20 hover:shadow-[0_12px_32px_-10px_rgba(255,87,34,0.1)]"
              )}
            >
              <div
                className={cn(
                  "flex flex-col flex-1 rounded-2xl p-6",
                  plan.highlight ? "bg-white dark:bg-card" : "bg-white dark:bg-card"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center rounded-full bg-lemon px-3 py-1 tag-code text-white font-bold lime-glow">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-4 border",
                    plan.highlight
                      ? "bg-lemon/15 border-lemon/25"
                      : "bg-mist/50 border-hairline"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      plan.highlight ? "text-moss" : "text-mute"
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold tracking-tight text-ink">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-500/20">
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-mute mt-1 leading-relaxed">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-5 mb-5">
                  <div className="flex items-end gap-1">
                    <span
                      className={cn(
                        "text-2xl font-extrabold tracking-tight",
                        plan.highlight ? "text-moss" : "text-ink"
                      )}
                    >
                      {displayPriceStr}
                    </span>
                    {plan.monthlyPriceFCFA !== null && plan.monthlyPriceFCFA > 0 && (
                      <span className="text-mute text-xs mb-1 font-medium">/mois</span>
                    )}
                  </div>
                  {interval === "yearly" && plan.yearlyPriceFCFA && plan.yearlyPriceFCFA > 0 && (
                    <p className="tag-code text-mute mt-1">
                      Facturé {(plan.yearlyPriceFCFA * 12).toLocaleString("fr-FR")} FCFA/an
                    </p>
                  )}
                  {plan.monthlyPriceFCFA === null && (
                    <p className="tag-code text-mute mt-1">Adapté à vos besoins</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs">
                      <div
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded-full flex items-center justify-center",
                          plan.highlight ? "bg-lemon/20" : "bg-mist"
                        )}
                      >
                        <Check
                          className={cn(
                            "size-2.5",
                            plan.highlight ? "text-moss" : "text-mute"
                          )}
                        />
                      </div>
                      <span className="text-ink/70 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full mt-6 rounded-full h-10 text-xs font-bold transition-all duration-200 gap-1.5 cursor-pointer",
                    plan.highlight
                      ? "bg-lemon text-white font-bold hover:bg-lemon/90 shadow-[0_6px_20px_-4px_rgba(255,87,34,0.4)] hover:-translate-y-0.5"
                      : isCurrent
                      ? "bg-mist text-mute cursor-not-allowed"
                      : "bg-ink text-white hover:bg-ink/90"
                  )}
                  disabled={isCurrent}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {isCurrent ? (
                    "Forfait actif"
                  ) : (
                    <>
                      <span>{plan.cta}</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-mute mt-10">
        Paiements sécurisés par Sebpay. Activation instantanée de vos quotas dès validation.
        Des questions ?{" "}
        <a
          href="mailto:support@korapulse.com"
          className="underline underline-offset-2 hover:text-[#FF5722] transition-colors font-semibold"
        >
          Contacter le support
        </a>
      </p>
    </div>
  );
}
