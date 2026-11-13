"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Download,
  Printer,
  ExternalLink,
  Layers,
  SendHorizontal,
  Building2,
  ArrowRight,
  Eye,
  FileText,
  ShieldCheck,
  Calendar,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PLAN_CONFIGS, getPlanFromClerkHas, type PlanId } from "@/lib/plan-limits";

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  period: string;
  planName: string;
  amountFCFA: number;
  status: "Payée" | "En attente" | "Annulée";
  paymentMethod: string;
}

export default function BillingTab() {
  const router = useRouter();
  const { user } = useUser();
  const { has } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Active plan identification (checks Clerk claims and user publicMetadata)
  const planId: PlanId = getPlanFromClerkHas(has, user?.publicMetadata);
  const planConfig = PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;

  // Real data: Fetch billing info & payments
  const { data: billingData } = useQuery({
    queryKey: ["billing-payments"],
    queryFn: async () => {
      const res = await fetch("/api/billing/payments");
      return res.json();
    },
  });

  // Real data: Fetch workspaces count
  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces-count"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      return res.json();
    },
  });
  const workspacesCount = Math.max(1, (workspacesData?.workspaces || []).length);

  // Real data: Fetch connected channels
  const { data: channelsData } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      return res.json();
    },
  });
  const connectedAccountsCount = (channelsData?.accounts || []).length;

  // Real data: Fetch competitors tracked count
  const { data: competitorsData } = useQuery({
    queryKey: ["competitors-count"],
    queryFn: async () => {
      const res = await fetch("/api/competitor");
      return res.json();
    },
  });
  const competitorsCount = (competitorsData?.competitors || []).length;

  // Real data: Fetch scheduled posts this month
  const { data: postsData } = useQuery({
    queryKey: ["posts-this-month"],
    queryFn: async () => {
      const res = await fetch("/api/post");
      return res.json();
    },
  });

  const monthPostsCount = useMemo(() => {
    const posts: any[] = postsData?.posts || [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return posts.filter((p) => {
      const d = new Date(p.scheduled_at || p.created_at);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [postsData]);

  // Invoices list for this user (real Sebpay payment tracking)
  const invoices: InvoiceItem[] = useMemo(() => {
    const dbPayments: any[] = billingData?.payments || [];
    if (dbPayments.length > 0) {
      return dbPayments.map((p) => {
        const d = new Date(p.paid_at || p.created_at);
        const dateStr = d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const periodStr = `${p.interval === "yearly" ? "Annuel" : "Mensuel"} · ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
        const planObj = PLAN_CONFIGS[p.plan_id as PlanId];
        const statusLabel: InvoiceItem["status"] =
          p.status === "approved"
            ? "Payée"
            : p.status === "pending"
            ? "En attente"
            : "Annulée";

        return {
          id: p.id,
          invoiceNumber:
            p.transaction_id ||
            `KP-${d.getFullYear()}-${p.id.slice(0, 6).toUpperCase()}`,
          date: dateStr,
          period: periodStr,
          planName: `Abonnement ${planObj?.name || p.plan_id}`,
          amountFCFA: p.amount_fcfa,
          status: statusLabel,
          paymentMethod: p.checkout_session_id
            ? "Sebpay (Mobile Money)"
            : "Paiement en ligne",
        };
      });
    }

    const now = new Date();
    const monthNames = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ];
    const currentMonthName = monthNames[now.getMonth()];
    const year = now.getFullYear();

    if (planId === "free") {
      return [
        {
          id: "inv-free-current",
          invoiceNumber: `KP-${year}-00${now.getMonth() + 1}`,
          date: `01 ${currentMonthName} ${year}`,
          period: `${currentMonthName} ${year}`,
          planName: "Forfait Gratuit",
          amountFCFA: 0,
          status: "Payée",
          paymentMethod: "Offre d'évaluation",
        },
      ];
    }

    const price = planConfig.monthlyPriceFCFA ?? 12000;
    return [
      {
        id: "inv-paid-current",
        invoiceNumber: `KP-${year}-00${now.getMonth() + 1}`,
        date: `01 ${currentMonthName} ${year}`,
        period: `${currentMonthName} ${year}`,
        planName: `Abonnement ${planConfig.name}`,
        amountFCFA: price,
        status: "Payée",
        paymentMethod: "Abonnement KORAPULSE",
      },
    ];
  }, [billingData, planId, planConfig]);

  // Direct PDF download using jsPDF
  const handleDownloadInvoicePDF = async (inv: InvoiceItem) => {
    setIsExportingPDF(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Brand Header (Orange #FF5722 / Black #0A0D14)
      doc.setFillColor(10, 13, 20);
      doc.rect(0, 0, 210, 36, "F");

      doc.setTextColor(255, 87, 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("KORAPULSE", 18, 18);

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.setFont("helvetica", "normal");
      doc.text("Plateforme de Planification & Veille Stratégique", 18, 25);

      // Invoice Title & Status
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURE ACQUITTÉE", 192, 18, { align: "right" });
      doc.setFontSize(9);
      doc.setTextColor(255, 87, 34);
      doc.text(`N° ${inv.invoiceNumber}`, 192, 25, { align: "right" });

      // Issuer & Customer Info
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ÉMETTEUR :", 18, 48);
      doc.setFont("helvetica", "normal");
      doc.text("KORAPULSE Technologies SAS", 18, 54);
      doc.text("Centre d'affaires & Innovation", 18, 59);
      doc.text("Brazzaville, République du Congo", 18, 64);
      doc.text("Email : facturation@korapulse.com", 18, 69);

      doc.setFont("helvetica", "bold");
      doc.text("CLIENT / DESTINATAIRE :", 120, 48);
      doc.setFont("helvetica", "normal");
      doc.text(user?.fullName || "Utilisateur KORAPULSE", 120, 54);
      doc.text(user?.primaryEmailAddress?.emailAddress || "client@workspace.com", 120, 59);
      doc.text(`Période : ${inv.period}`, 120, 64);
      doc.text(`Date d'émission : ${inv.date}`, 120, 69);

      // Table of items
      autoTable(doc, {
        startY: 78,
        head: [["Désignation", "Période", "Quantité", "Prix unitaire", "Total TTC"]],
        body: [
          [
            inv.planName,
            inv.period,
            "1 mois",
            inv.amountFCFA === 0 ? "0 FCFA" : `${inv.amountFCFA.toLocaleString("fr-FR")} FCFA`,
            inv.amountFCFA === 0 ? "0 FCFA" : `${inv.amountFCFA.toLocaleString("fr-FR")} FCFA`,
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [10, 13, 20],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 35, halign: "right" },
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 110;

      // Summary Totals
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Total HT :", 140, finalY + 12);
      doc.text(
        inv.amountFCFA === 0 ? "0 FCFA" : `${inv.amountFCFA.toLocaleString("fr-FR")} FCFA`,
        192,
        finalY + 12,
        { align: "right" }
      );

      doc.setFont("helvetica", "normal");
      doc.text("TVA (0% - Régime numérique) :", 140, finalY + 18);
      doc.text("0 FCFA", 192, finalY + 18, { align: "right" });

      doc.setDrawColor(255, 87, 34);
      doc.setLineWidth(0.5);
      doc.line(140, finalY + 22, 192, finalY + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 87, 34);
      doc.text("TOTAL NET :", 140, finalY + 28);
      doc.text(
        inv.amountFCFA === 0 ? "0 FCFA" : `${inv.amountFCFA.toLocaleString("fr-FR")} FCFA`,
        192,
        finalY + 28,
        { align: "right" }
      );

      // Payment stamp box
      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, finalY + 10, 80, 22, 3, 3, "FD");
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURE PAYÉE - ACQUITTÉE", 24, finalY + 18);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Règlement : ${inv.paymentMethod}`, 24, finalY + 25);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "KORAPULSE SAS · RCCM CG-BZV · Facture générée électroniquement et certifiée conforme.",
        105,
        282,
        { align: "center" }
      );

      doc.save(`Facture-${inv.invoiceNumber}.pdf`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Browser Print Trigger
  const handlePrintInvoice = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Top Section: Active Plan & Quotas ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <div className="relative border-b border-slate-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF5722]/50 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF5722]">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                  Votre forfait actif
                </h2>
                <span className="rounded-full bg-orange-50 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-bold text-[#FF5722]">
                  {planConfig.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {planConfig.monthlyPriceFCFA === 0
                  ? "Offre Gratuite · Évaluation permanente sans carte bancaire"
                  : `${planConfig.monthlyPriceFCFA?.toLocaleString("fr-FR")} FCFA / mois · ${
                      billingData?.planExpiresAt
                        ? `Actif jusqu'au ${new Date(billingData.planExpiresAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`
                        : "Abonnement actif"
                    }`}
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/billing")}
            className="h-9 rounded-xl bg-[#0A0D14] px-4 text-xs font-bold text-white hover:bg-[#FF5722] transition-colors shadow-2xs gap-1.5 cursor-pointer"
          >
            <span>Mettre à niveau mon offre</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {/* Quotas grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Canaux connectés */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Canaux connectés</span>
              <Layers className="size-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">
                  {connectedAccountsCount}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {planConfig.maxConnectedChannels === Infinity
                    ? "Illimités"
                    : `/ ${planConfig.maxConnectedChannels} max`}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#FF5722] rounded-full transition-all"
                  style={{
                    width: `${
                      planConfig.maxConnectedChannels === Infinity
                        ? 30
                        : Math.min(100, (connectedAccountsCount / planConfig.maxConnectedChannels) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Publications planifiées ce mois */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Publications ce mois</span>
              <SendHorizontal className="size-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">
                  {monthPostsCount}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {planConfig.maxScheduledPostsPerMonth === Infinity
                    ? "Illimitées"
                    : `/ ${planConfig.maxScheduledPostsPerMonth} max`}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#FF5722] rounded-full transition-all"
                  style={{
                    width: `${
                      planConfig.maxScheduledPostsPerMonth === Infinity
                        ? 25
                        : Math.min(100, (monthPostsCount / planConfig.maxScheduledPostsPerMonth) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Espaces de travail */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Espaces de travail</span>
              <Building2 className="size-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{workspacesCount}</span>
                <span className="text-xs font-bold text-slate-500">
                  {planConfig.maxWorkspaces === Infinity
                    ? "Illimités"
                    : `/ ${planConfig.maxWorkspaces} max`}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#FF5722] rounded-full transition-all"
                  style={{
                    width: `${
                      planConfig.maxWorkspaces === Infinity
                        ? 20
                        : Math.min(100, (workspacesCount / planConfig.maxWorkspaces) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Bottom Section: Invoices & Billing Tracking ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <div className="relative border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF5722]/50 to-transparent" />
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Historique et suivi des factures
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez, téléchargez et imprimez vos justificatifs comptables officiels KORAPULSE.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {invoices.length} facture{invoices.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 font-semibold uppercase tracking-wider">N° Facture</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Date</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Période</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Désignation</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Montant TTC</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Statut</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="py-3.5 font-bold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5 text-[#FF5722]" />
                      {inv.invoiceNumber}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-600">{inv.date}</td>
                  <td className="py-3.5 text-slate-600 font-medium">{inv.period}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{inv.planName}</td>
                  <td className="py-3.5 font-black text-slate-900">
                    {inv.amountFCFA === 0 ? "0 FCFA" : `${inv.amountFCFA.toLocaleString("fr-FR")} FCFA`}
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="size-3" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors cursor-pointer"
                        title="Voir la facture"
                      >
                        <Eye className="size-3" />
                        <span>Aperçu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoicePDF(inv)}
                        disabled={isExportingPDF}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors cursor-pointer"
                        title="Télécharger en PDF"
                      >
                        <Download className="size-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0A0D14] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#FF5722] transition-colors cursor-pointer shadow-2xs"
                        title="Imprimer directement"
                      >
                        <Printer className="size-3" />
                        <span>Imprimer</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Modal Aperçu & Impression Officielle de la Facture ── */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="sr-only">Facture KORAPULSE</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div id="printable-invoice" className="flex flex-col gap-6 text-slate-900">
              {/* Header Invoice */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xl font-black tracking-tight text-[#FF5722]">
                    KORAPULSE
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Plateforme de Planification &amp; Veille Concurrentielle
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    KORAPULSE Technologies SAS<br />
                    Brazzaville, République du Congo<br />
                    facturation@korapulse.com
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {selectedInvoice.status}
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-2">
                    FACTURE N° {selectedInvoice.invoiceNumber}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date : {selectedInvoice.date}
                  </p>
                </div>
              </div>

              {/* Customer & Period Info */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Facturé à :
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    {user?.fullName || "Utilisateur KORAPULSE"}
                  </p>
                  <p className="text-slate-500">
                    {user?.primaryEmailAddress?.emailAddress || "client@workspace.com"}
                  </p>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Modalités :
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    Période : {selectedInvoice.period}
                  </p>
                  <p className="text-slate-500">
                    Mode : {selectedInvoice.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Invoice Lines Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Désignation</th>
                      <th className="py-2.5 px-3 font-bold text-center">Qté</th>
                      <th className="py-2.5 px-3 font-bold text-right">Prix Unitaire</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {selectedInvoice.planName} — {selectedInvoice.period}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">1</td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {selectedInvoice.amountFCFA === 0
                          ? "0 FCFA"
                          : `${selectedInvoice.amountFCFA.toLocaleString("fr-FR")} FCFA`}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {selectedInvoice.amountFCFA === 0
                          ? "0 FCFA"
                          : `${selectedInvoice.amountFCFA.toLocaleString("fr-FR")} FCFA`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total calculations */}
              <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 pt-4 text-xs">
                <div className="flex w-60 justify-between">
                  <span className="text-slate-500">Sous-total HT :</span>
                  <span className="font-semibold text-slate-800">
                    {selectedInvoice.amountFCFA === 0
                      ? "0 FCFA"
                      : `${selectedInvoice.amountFCFA.toLocaleString("fr-FR")} FCFA`}
                  </span>
                </div>
                <div className="flex w-60 justify-between">
                  <span className="text-slate-500">TVA (0% service numérique) :</span>
                  <span className="font-semibold text-slate-800">0 FCFA</span>
                </div>
                <div className="flex w-60 justify-between border-t border-slate-200 pt-2 text-sm font-black text-[#FF5722]">
                  <span>Total Net Payé :</span>
                  <span>
                    {selectedInvoice.amountFCFA === 0
                      ? "0 FCFA"
                      : `${selectedInvoice.amountFCFA.toLocaleString("fr-FR")} FCFA`}
                  </span>
                </div>
              </div>

              {/* Footer Actions inside modal */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <span className="text-[11px] text-slate-400">
                  Document certifié acquitté par KORAPULSE.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadInvoicePDF(selectedInvoice)}
                    disabled={isExportingPDF}
                    className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    Télécharger PDF
                  </Button>
                  <Button
                    onClick={() => handlePrintInvoice(selectedInvoice)}
                    className="h-9 rounded-xl bg-[#0A0D14] hover:bg-[#FF5722] text-white text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="size-3.5" />
                    Imprimer la facture
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

