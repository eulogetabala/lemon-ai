"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Clock,
  CheckCircle2,
  Plus,
  BarChart3,
  Printer,
  Trash2,
  ScanSearch,
  ArrowRight,
  Layers,
} from "lucide-react";
import { ChannelType } from "@/types/channel.type";
import { PostType } from "@/types/post.type";
import { CompetitorListItem } from "@/types/competitor.type";

interface GeneratedReport {
  id: string;
  title: string;
  period: string;
  generatedAt: string;
  connectedChannelsCount: number;
  postsCount: number;
  competitorsCount: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Real channels from Supabase
  const { data: channelsData } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const channels = (channelsData?.channels || []) as ChannelType[];
  const connectedCount = channelsData?.connectedCount ?? 0;

  // 2. Real posts
  const { data: postsData } = useQuery({
    queryKey: ["reportsPosts"],
    queryFn: async () => {
      const res = await fetch("/api/post");
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const posts = (postsData?.posts || []) as PostType[];

  // 3. Real competitors
  const { data: competitorsData } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const res = await fetch("/api/competitor");
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const competitors = (competitorsData?.competitors || []) as CompetitorListItem[];

  // Generate real report on the fly
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const newReport: GeneratedReport = {
        id: `rep-${Date.now()}`,
        title: `Bilan d'activité — ${dateStr}`,
        period: "Période en cours",
        generatedAt: dateStr,
        connectedChannelsCount: connectedCount,
        postsCount: posts.length,
        competitorsCount: competitors.length,
      };
      setReports((prev) => [newReport, ...prev]);
      setIsGenerating(false);
    }, 600);
  };

  const handleDeleteReport = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Rapports &amp; Livrables
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Générez des synthèses de performance et bilans stratégiques fondés sur vos données réelles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF5722] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#F4511E] active:scale-[0.98] disabled:opacity-60"
        >
          <Plus className="size-4" />
          {isGenerating ? "Compilation en cours..." : "Compiler un rapport réel"}
        </button>
      </div>

      {/* Summary Cards with Real Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FileText className="size-4 text-[#FF5722]" />
            Rapports disponibles
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {reports.length}
          </div>
          <span className="mt-1 text-xs text-slate-400">
            {reports.length > 0 ? "Documents prêts à l'export" : "Aucun rapport généré"}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BarChart3 className="size-4 text-slate-900" />
            Canaux connectés
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {connectedCount}
          </div>
          <span className="mt-1 text-xs text-slate-400">
            Sur vos réseaux sociaux configurés
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ScanSearch className="size-4 text-[#FF5722]" />
            Concurrents audités
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {competitors.length}
          </div>
          <span className="mt-1 text-xs text-slate-400">
            Marques sous surveillance
          </span>
        </div>
      </div>

      {/* Reports Table or Real Empty State */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Historique des rapports
          </h2>
          <span className="text-xs font-medium text-slate-400">
            Format exportable (PDF &amp; Impression)
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF5722]">
              <FileText className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              Aucun rapport généré pour le moment
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              Cliquez sur le bouton ci-dessous pour compiler vos données réelles (canaux, publications et veille) en un document de synthèse.
            </p>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#F4511E]"
            >
              <Plus className="size-3.5" />
              {isGenerating ? "Génération..." : "Générer un premier rapport"}
            </button>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Intitulé</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Données incluses</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Date de génération</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Statut</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((rep) => (
                  <tr key={rep.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                          <FileText className="size-3.5" />
                        </div>
                        {rep.title}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {rep.connectedChannelsCount} canaux · {rep.postsCount} posts · {rep.competitorsCount} concurrents
                    </td>
                    <td className="py-3.5 text-slate-500">{rep.generatedAt}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-bold text-[#FF5722]">
                        <CheckCircle2 className="size-3" />
                        Prêt
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          title="Imprimer / Exporter PDF"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Printer className="size-3 text-slate-500" />
                          Imprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(rep.id)}
                          title="Supprimer"
                          className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
