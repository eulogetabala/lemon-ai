"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAN_CONFIGS, getCheckoutAmountFCFA, type PlanId, type PlanInterval } from "@/lib/plan-limits";

type OperatorType = "mtn_congo" | "airtel_congo";

export default function MobileMoneyCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planParam = (searchParams.get("plan") || "pro") as PlanId;
  const intervalParam = (searchParams.get("interval") || "monthly") as PlanInterval;

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(
    planParam === "team" ? "team" : "pro"
  );
  const [selectedInterval, setSelectedInterval] = useState<PlanInterval>(
    intervalParam === "yearly" ? "yearly" : "monthly"
  );
  const [operator, setOperator] = useState<OperatorType>("mtn_congo");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const planConfig = PLAN_CONFIGS[selectedPlanId] || PLAN_CONFIGS.pro;
  const totalAmount = getCheckoutAmountFCFA(selectedPlanId, selectedInterval) || 12000;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanDigits = phone.replace(/[^0-9]/g, "");
    if (cleanDigits.length < 9) {
      setErrorMessage(
        "Veuillez saisir un numéro de téléphone congolais valide à 9 chiffres (ex: 06 123 45 67 ou 05 123 45 67)."
      );
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = phone
        ? `+242${phone.replace(/^(\+242|0)/, "").replace(/[^0-9]/g, "")}`
        : undefined;

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          interval: selectedInterval,
          operator,
          phone: formattedPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible d'initialiser le paiement.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Lien de paiement non reçu.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur est survenue lors de l'initialisation du paiement.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Retour aux forfaits</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Checkout Form */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5722]">
                    Paiement Mobile Money Congo
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    Règlement sécurisé
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck className="size-3.5" />
                  <span>Certifié Sebpay</span>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handlePay} className="mt-6 flex flex-col gap-6">
                {/* 1. Opérateur Mobile Money Congo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2.5">
                    Sélectionnez votre opérateur Mobile Money
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* MTN Congo */}
                    <button
                      type="button"
                      onClick={() => setOperator("mtn_congo")}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer",
                        operator === "mtn_congo"
                          ? "border-[#FFCC00] bg-amber-50/60 ring-2 ring-[#FFCC00]/40 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFCC00] text-slate-900 font-black text-xs shadow-2xs mb-2">
                        MTN
                      </div>
                      <span className="text-xs font-bold text-slate-900">MTN MoMo</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Congo (06...)</span>
                      {operator === "mtn_congo" && (
                        <div className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-[#FFCC00] text-slate-900">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* Airtel Congo */}
                    <button
                      type="button"
                      onClick={() => setOperator("airtel_congo")}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer",
                        operator === "airtel_congo"
                          ? "border-[#E60000] bg-red-50/60 ring-2 ring-[#E60000]/30 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex size-11 items-center justify-center rounded-xl bg-[#E60000] text-white font-black text-xs shadow-2xs mb-2">
                        airtel
                      </div>
                      <span className="text-xs font-bold text-slate-900">Airtel Money</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Congo (04/05...)</span>
                      {operator === "airtel_congo" && (
                        <div className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-[#E60000] text-white">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Numéro Mobile Money Congo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Numéro {operator === "mtn_congo" ? "MTN MoMo" : "Airtel Money"} (Congo)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center gap-1.5 font-bold text-xs text-slate-600 border-r border-slate-200 pr-2">
                      <span>🇨🇬 +242</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={operator === "mtn_congo" ? "06 123 45 67" : "05 123 45 67"}
                      className="h-11 w-full rounded-2xl border border-slate-200 pl-24 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-12 rounded-2xl font-bold text-sm shadow-md transition-all gap-2 cursor-pointer",
                    operator === "mtn_congo"
                      ? "bg-[#FFCC00] text-slate-900 hover:bg-[#F5C400] shadow-amber-500/20"
                      : "bg-[#E60000] text-white hover:bg-[#CC0000] shadow-red-500/25"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Connexion à l&apos;opérateur...</span>
                    </>
                  ) : (
                    <span>
                      Payer {totalAmount.toLocaleString("fr-FR")} FCFA avec{" "}
                      {operator === "mtn_congo" ? "MTN MoMo" : "Airtel Money"}
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">
                Récapitulatif de commande
              </h2>

              {/* Plan Switcher Pills */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => setSelectedPlanId("pro")}
                  className={cn(
                    "py-2 text-xs font-bold rounded-xl transition-all",
                    selectedPlanId === "pro"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Forfait Pro
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanId("team")}
                  className={cn(
                    "py-2 text-xs font-bold rounded-xl transition-all",
                    selectedPlanId === "team"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Forfait Équipe
                </button>
              </div>

              {/* Interval Toggle */}
              <div className="flex items-center justify-between py-3 border-y border-slate-100 text-xs">
                <span className="font-semibold text-slate-600">Période de facturation</span>
                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedInterval("monthly")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                      selectedInterval === "monthly"
                        ? "bg-[#0A0D14] text-white"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInterval("yearly")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1",
                      selectedInterval === "yearly"
                        ? "bg-[#0A0D14] text-white"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <span>Annuel</span>
                    <span className="text-[9px] bg-[#FF5722] text-white px-1 rounded-full">-20%</span>
                  </button>
                </div>
              </div>

              {/* Features list */}
              <div className="mt-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-900">
                  Avantages inclus dans {planConfig.name} :
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  {planConfig.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-[#FF5722] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total Calculation */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Sous-total HT</span>
                  <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Frais opérateur Mobile Money</span>
                  <span className="text-emerald-600 font-semibold">Inclus</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-sm font-extrabold text-slate-900">Total à débiter</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">
                      {totalAmount.toLocaleString("fr-FR")} FCFA
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {selectedInterval === "yearly" ? "Facturé pour 1 an" : "Facturé pour 30 jours"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistance note */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 flex items-center gap-3">
              <HelpCircle className="size-5 text-slate-400 shrink-0" />
              <div>
                Besoin d&apos;assistance pour payer avec MTN MoMo ou Airtel ? Contactez le support à{" "}
                <a href="mailto:support@korapulse.com" className="text-[#FF5722] font-semibold underline">
                  support@korapulse.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
