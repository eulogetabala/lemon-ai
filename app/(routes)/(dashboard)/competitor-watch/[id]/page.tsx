"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  ImageOff,
  MessageCircle,
  RefreshCw,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Users,
  Globe,
  Plus,
  PenTool,
  Clock,
  FileDown,
  FileText,
  Presentation,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  NewTwitterIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { stripRichTextFormatting } from "@/lib/rich-text";
import { buildProfileUrl, usernameFromHandle } from "@/lib/competitor-stats";
import { PLATFORM_META, formatNumber, formatMonth, pctChange, timeAgo } from "../_data";
import type {
  CompetitorDetail,
  CompetitorPost,
  CompetitorPlatformKey,
  CompetitorStat,
} from "@/types/competitor.type";
import type { CompetitorReportData } from "@/lib/export-report";

const ICON_MAP: Record<string, any> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  tiktok: TiktokIcon,
  twitter: NewTwitterIcon,
  youtube: YoutubeIcon,
};

function DeltaBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-400">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  const isUp = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-bold",
        isUp ? "text-[#FF5722]" : "text-slate-500"
      )}
    >
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? "+" : ""}
      {change}%
    </span>
  );
}

function MiniCalendar({
  month,
  posts,
  availableMonths,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: {
  month: string;
  posts: CompetitorPost[];
  availableMonths: string[];
  onMonthChange: (month: string) => void;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const map = new Map<number, CompetitorPost[]>();
    for (const post of posts) {
      const date = new Date(post.publishedAt);
      if (date.getFullYear() !== year || date.getMonth() !== monthNumber - 1) continue;
      const day = date.getDate();
      map.set(day, [...(map.get(day) ?? []), post]);
    }
    return map;
  }, [posts, year, monthNumber]);

  const monthIndex = availableMonths.indexOf(month);
  const canGoOlder = monthIndex >= 0 && monthIndex < availableMonths.length - 1;
  const canGoNewer = monthIndex > 0;

  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#FF5722]" />
          <span className="text-xs font-bold text-slate-900 capitalize">
            {formatMonth(month)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoOlder}
            onClick={() => canGoOlder && onMonthChange(availableMonths[monthIndex + 1])}
            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={!canGoNewer}
            onClick={() => canGoNewer && onMonthChange(availableMonths[monthIndex - 1])}
            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((d) => (
          <span
            key={d}
            className="text-center text-[10px] font-bold uppercase text-slate-400 py-1"
          >
            {d}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <span key={`empty-${idx}`} />;
          const dayPosts = byDay.get(day) || [];
          const count = dayPosts.length;
          const active = selectedDay === day;

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={count === 0}
              onClick={() => onSelectDay(active ? null : day)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-all",
                count === 0 && "text-slate-300",
                count > 0 && !active && "bg-orange-50 font-bold text-[#FF5722] hover:bg-orange-100",
                active && "bg-[#FF5722] font-black text-white shadow-sm"
              )}
            >
              {day}
              {count > 0 && !active && (
                <span className="absolute bottom-1 size-1 rounded-full bg-[#FF5722]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<CompetitorDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [viewFilter, setViewFilter] = useState<"all" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState<CompetitorPost | null>(null);

  const POSTS_PER_PAGE = 8;

  useEffect(() => {
    let cancelled = false;
    const monthQuery = selectedMonth ? `?month=${selectedMonth}` : "";

    const loadDetail = async () => {
      try {
        const res = await fetch(`/api/competitor/${id}${monthQuery}`);
        if (!res.ok) {
          if (!cancelled) setDetail(null);
          return;
        }
        const data: CompetitorDetail = await res.json();
        if (cancelled) return;
        setDetail(data);
        if (data && !selectedMonth) {
          setSelectedMonth(data.month);
        }
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id, selectedMonth]);

  const allPosts = detail?.allPosts || [];
  const posts = detail?.posts || [];
  const currentMonth = selectedMonth ?? detail?.month ?? "";
  const platforms = detail?.competitor?.platforms || [];

  const currentPlatforms = useMemo(() => {
    if (selectedPlatform === "all") return platforms;
    return platforms.filter((p) => p.platform === selectedPlatform);
  }, [platforms, selectedPlatform]);

  const currentAllPosts = useMemo(() => {
    if (selectedPlatform === "all") return allPosts;
    return allPosts.filter((p) => p.platform === selectedPlatform);
  }, [allPosts, selectedPlatform]);

  const currentMonthPosts = useMemo(() => {
    if (selectedPlatform === "all") return posts;
    return posts.filter((p) => p.platform === selectedPlatform);
  }, [posts, selectedPlatform]);

  // Filtered post list for display (MUST be called before any early returns to respect Rules of Hooks)
  const displayedPosts = useMemo(() => {
    let list = viewFilter === "all" ? currentAllPosts : currentMonthPosts;
    if (selectedDay && currentMonth) {
      const [y, m] = currentMonth.split("-").map(Number);
      list = list.filter((p) => {
        const d = new Date(p.publishedAt);
        return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === selectedDay;
      });
    }
    return list;
  }, [currentAllPosts, currentMonthPosts, viewFilter, selectedDay, currentMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform, viewFilter, selectedDay, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(displayedPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return displayedPosts.slice(start, start + POSTS_PER_PAGE);
  }, [displayedPosts, currentPage]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await fetch(`/api/competitor/${id}/sync`, { method: "POST" });
      const res = await fetch(`/api/competitor/${id}${selectedMonth ? `?month=${selectedMonth}` : ""}`);
      if (res.ok) {
        const refreshed: CompetitorDetail = await res.json();
        setDetail(refreshed);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async (format: "pdf" | "pptx", channelPlatform?: string) => {
    if (isExporting || !detail) return;
    setIsExporting(true);
    setExportMenu(false);
    try {
      const { competitor: comp } = detail;
      const targetPlat =
        channelPlatform === "all"
          ? undefined
          : channelPlatform ?? (selectedPlatform !== "all" ? selectedPlatform : undefined);

      const filteredPlatforms = targetPlat
        ? comp.platforms.filter((p) => p.platform === targetPlat)
        : comp.platforms;

      const filteredStats = targetPlat
        ? (detail.allStats ?? []).filter((s) => s.platform === targetPlat)
        : (detail.allStats ?? []);

      const filteredPosts = targetPlat
        ? allPosts.filter((p) => p.platform === targetPlat)
        : allPosts;

      const activePlatObj = targetPlat
        ? comp.platforms.find((p) => p.platform === targetPlat)
        : undefined;

      const reportData: CompetitorReportData = {
        competitorName: comp.name,
        channelName: targetPlat ? targetPlat.charAt(0).toUpperCase() + targetPlat.slice(1) : null,
        channelHandle: activePlatObj?.handle ? usernameFromHandle(activePlatObj.handle) : null,
        industry: comp.industry,
        website: comp.website,
        platforms: filteredPlatforms.map((p) => ({
          platform: p.platform,
          handle: p.handle,
          followers: p.followers,
          profileUrl: p.profileUrl,
        })),
        stats: filteredStats.map((s) => ({ ...s })),
        posts: filteredPosts.map((p) => ({
          content: p.content,
          platform: p.platform,
          publishedAt: p.publishedAt,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          views: p.views ?? 0,
          engagementRate: p.engagementRate,
        })),
        generatedAt: new Date().toISOString(),
      };
      if (format === "pdf") {
        const { downloadCompetitorPDF } = await import("@/lib/export-report");
        await downloadCompetitorPDF(reportData);
      } else {
        const { downloadCompetitorPPTX } = await import("@/lib/export-report");
        await downloadCompetitorPPTX(reportData);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !detail) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-[#FF5722]" />
        <span className="text-xs font-semibold text-slate-500">
          Chargement de l&apos;analyse concurrentielle...
        </span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-bold text-slate-800">Concurrent introuvable.</p>
        <Link
          href="/competitor-watch"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          <ArrowLeft className="size-3.5" />
          Retour à la veille
        </Link>
      </div>
    );
  }

  const { competitor, availableMonths, stats, prevStats } = detail;

  const totalFollowers = competitor.platforms.reduce((sum, p) => sum + p.followers, 0);
  const displayedFollowers = currentPlatforms.reduce((sum, p) => sum + p.followers, 0);

  const currentStats =
    selectedPlatform === "all"
      ? stats
      : stats.filter((s) => s.platform === selectedPlatform);

  // Month-specific sums for active platform view
  const monthLikes = currentStats.reduce((acc, s) => acc + s.likes, 0);
  const monthComments = currentStats.reduce((acc, s) => acc + s.comments, 0);
  const monthShares = currentStats.reduce((acc, s) => acc + s.shares, 0);
  const monthInteractions = monthLikes + monthComments + monthShares;
  const monthEngagement =
    currentStats.length > 0
      ? currentStats.reduce((acc, s) => acc + s.engagementRate, 0) / currentStats.length
      : displayedFollowers > 0
      ? (monthInteractions / displayedFollowers) * 100
      : 0;

  // Global sums across tracked posts for active platform view
  const globalLikes = currentAllPosts.reduce((acc, p) => acc + p.likes, 0);
  const globalComments = currentAllPosts.reduce((acc, p) => acc + p.comments, 0);
  const globalShares = currentAllPosts.reduce((acc, p) => acc + p.shares, 0);
  const globalInteractions = globalLikes + globalComments + globalShares;
  const globalEngagement =
    displayedFollowers > 0 && globalInteractions > 0
      ? (globalInteractions / displayedFollowers) * 100
      : monthEngagement;

  const activePlatformObj = competitor.platforms.find((p) => p.platform === selectedPlatform);

  return (
    <div className="flex flex-col gap-6 pb-14">
      {/* ── 1. Top Navigation & Brand Header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/competitor-watch"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="size-3.5" />
            Retour à la veille concurrentielle
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAnalysisModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-[#FF5722] shadow-xs transition-all hover:bg-[#FF5722] hover:text-white cursor-pointer"
            >
              <Layers className="size-3.5" />
              <span>Analyse &amp; Recommandations</span>
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenu((v) => !v)}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition-all hover:border-[#FF5722] hover:text-[#FF5722] disabled:opacity-60 cursor-pointer"
              >
                <FileDown className={cn("size-3.5", isExporting && "animate-pulse")} />
                {isExporting ? "Génération en cours..." : "Télécharger le rapport"}
                <ChevronRight className={cn("size-3 transition-transform", exportMenu && "rotate-90")} />
              </button>

              {exportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl">
                  {/* Active channel section if one is selected */}
                  {selectedPlatform !== "all" && activePlatformObj && (
                    <div className="mb-2 pb-2.5 border-b border-slate-100">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF5722]">
                        Canal actif : {activePlatformObj.platform.toUpperCase()}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExport("pdf", selectedPlatform)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-[#FF5722] hover:bg-[#FF5722] hover:text-white transition-colors"
                        >
                          <FileText className="size-3" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport("pptx", selectedPlatform)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-[#FF5722] hover:bg-[#FF5722] hover:text-white transition-colors"
                        >
                          <Presentation className="size-3" />
                          PPTX
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Individual channels list */}
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rapports individuels par canal
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {competitor.platforms.map((p) => (
                      <div
                        key={p.platform}
                        className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {p.platform}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleExport("pdf", p.platform)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors"
                            title={`Télécharger PDF ${p.platform}`}
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExport("pptx", p.platform)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors"
                            title={`Télécharger PPTX ${p.platform}`}
                          >
                            PPTX
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Consolidated report */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rapport consolidé global
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExport("pdf", "all")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
                      >
                        <FileText className="size-3" />
                        Tous (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport("pptx", "all")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
                      >
                        <Presentation className="size-3" />
                        Tous (PPTX)
                      </button>
                    </div>
                  </div>
                </div>
              </>
              )}
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5 text-white", isSyncing && "animate-spin")} />
              {isSyncing ? "Synchronisation en cours..." : "Actualiser les données"}
            </button>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#0A0D14] text-white font-black text-xl shadow-md">
              {competitor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {competitor.name}
                </h1>
                <span className="rounded-full bg-orange-50 border border-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF5722]">
                  Veille active
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {competitor.industry && (
                  <span className="font-semibold text-slate-700">{competitor.industry}</span>
                )}
                <span>•</span>
                <span>{competitor.platforms.length} canal/canaux sous surveillance</span>
              </div>
            </div>
          </div>

          {competitor.website && (
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Globe className="size-3.5 text-slate-500" />
              Site web
            </a>
          )}
        </div>
      </div>

      {/* ── 2. Système de Tabulation Multi-Réseaux (Facebook, LinkedIn, Instagram...) ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Onglet Vue Cumulée */}
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform("all");
                setSelectedDay(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
                selectedPlatform === "all"
                  ? "bg-[#0A0D14] text-white shadow-md ring-2 ring-slate-900/10"
                  : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Layers className={cn("size-3.5", selectedPlatform === "all" ? "text-[#FF5722]" : "text-slate-400")} />
              <span>Tous les réseaux</span>
              <span className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-black",
                selectedPlatform === "all" ? "bg-white/15 text-white" : "bg-white border border-slate-200 text-slate-800"
              )}>
                {totalFollowers > 0 ? formatNumber(totalFollowers) : "Actif"}
              </span>
            </button>

            {/* Onglets Réseaux Spécifiques */}
            {competitor.platforms.map((p) => {
              const PlatformIcon = ICON_MAP[p.platform] || FacebookIcon;
              const isSelected = selectedPlatform === p.platform;
              return (
                <button
                  key={p.platform}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(p.platform);
                    setSelectedDay(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#0A0D14] text-white shadow-md ring-2 ring-[#FF5722]/30"
                      : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <HugeiconsIcon
                    icon={PlatformIcon}
                    className={cn("size-3.5", isSelected ? "text-[#FF5722]" : "text-slate-500")}
                  />
                  <span className="capitalize">{p.platform}</span>
                  {p.handle && (
                    <span className={cn("text-[11px] font-medium hidden sm:inline", isSelected ? "text-white/60" : "text-slate-400")}>
                      @{usernameFromHandle(p.handle)}
                    </span>
                  )}
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-black",
                    isSelected ? "bg-white/15 text-white" : "bg-white border border-slate-200 text-slate-800"
                  )}>
                    {p.followers > 0 ? formatNumber(p.followers) : "Actif"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Actions pour le canal actif */}
          {activePlatformObj && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Boutons d'export direct du canal actif */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleExport("pdf", activePlatformObj.platform)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-orange-50 hover:text-[#FF5722] transition-colors cursor-pointer"
                  title={`Télécharger le rapport ${activePlatformObj.platform} en PDF`}
                >
                  <FileText className="size-3" />
                  <span>PDF {activePlatformObj.platform}</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => handleExport("pptx", activePlatformObj.platform)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-orange-50 hover:text-[#FF5722] transition-colors cursor-pointer"
                  title={`Télécharger le rapport ${activePlatformObj.platform} en PPTX`}
                >
                  <Presentation className="size-3" />
                  <span>PPTX {activePlatformObj.platform}</span>
                </button>
              </div>

              <a
                href={buildProfileUrl(activePlatformObj.platform, activePlatformObj.handle) || activePlatformObj.profileUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:border-[#FF5722] hover:text-[#FF5722]"
              >
                <span>Consulter la page officielle</span>
                <ExternalLink className="size-3 text-slate-400" />
              </a>
            </div>
          )}
        </div>

        {/* Sous-titre informatif de la tabulation active */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#FF5722]" />
            <span className="font-semibold text-slate-700">
              {selectedPlatform === "all"
                ? `Vue consolidée de l'ensemble des ${competitor.platforms.length} canal/canaux sous surveillance.`
                : `Détail exclusif de la page ${activePlatformObj?.platform.toUpperCase()} (@${usernameFromHandle(activePlatformObj?.handle)})`}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {currentAllPosts.length} publication(s) indexée(s)
          </span>
        </div>
      </div>

      {/* ── 3. Top 4 Real Performance Metrics ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Audience totale */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {selectedPlatform === "all" ? "Audience cumulée" : `Abonnés ${selectedPlatform.toUpperCase()}`}
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {displayedFollowers > 0 ? displayedFollowers.toLocaleString("fr-FR") : "—"}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Abonnés réels</span>
              <span className="font-bold text-[#FF5722]">En direct</span>
            </div>
          </div>
        </div>

        {/* Publications analysées */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Publications suivies</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF5722]">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {currentAllPosts.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Contenus indexés</span>
              <span className="font-bold text-slate-900">
                {currentMonthPosts.length} ce mois
              </span>
            </div>
          </div>
        </div>

        {/* Interactions totales */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Interactions totales</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Heart className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {globalInteractions > 0 ? globalInteractions.toLocaleString("fr-FR") : (monthInteractions > 0 ? monthInteractions : 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">J&apos;aime, com. &amp; partages</span>
              <span className="font-bold text-[#FF5722]">
                {globalLikes} likes · {globalComments} com.
              </span>
            </div>
          </div>
        </div>

        {/* Taux d'engagement moyen */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taux d&apos;engagement</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF5722]">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {monthEngagement > 0
                ? `${monthEngagement.toFixed(1)} %`
                : globalInteractions > 0 && totalFollowers > 0
                ? `${((globalInteractions / totalFollowers) * 100).toFixed(1)} %`
                : "0.0 %"}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Ratio moyen par publication</span>
              <span className="font-bold text-slate-900">Benchmark</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Dashboard Layout (Full Width) ── */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm w-full">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Publications du concurrent ({displayedPosts.length})
                </h2>
                {selectedPlatform !== "all" && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    {selectedPlatform}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {viewFilter === "month"
                  ? `Publications relevées depuis le 1er ${formatMonth(currentMonth)}.`
                  : "Historique complet des publications indexées pour ce concurrent."}
              </p>
            </div>

            {/* View Filter Pill */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1">
              <button
                type="button"
                onClick={() => {
                  setViewFilter("month");
                  setSelectedDay(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                  viewFilter === "month" && !selectedDay
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Depuis le 1er du mois ({currentMonthPosts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewFilter("all");
                  setSelectedDay(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                  viewFilter === "all" && !selectedDay
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Toutes ({currentAllPosts.length})
              </button>
            </div>
          </div>

          {/* Posts Grid of Clickable Cards: Full width 4 columns on large screens! */}
          <div className="mt-6">
            {displayedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
                <Layers className="size-8 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-800">
                  Aucune publication trouvée pour ce filtre
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Cliquez sur &quot;Actualiser les données&quot; pour relancer l&apos;analyse du fil public de ce concurrent.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedPosts.map((post) => {
                  const PlatformIcon = ICON_MAP[post.platform] || FacebookIcon;
                  const pubDate = new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const platformObj = competitor.platforms.find((p) => p.platform === post.platform);
                  const postTargetUrl =
                    post.postUrl ||
                    (platformObj ? buildProfileUrl(platformObj.platform, platformObj.handle) || platformObj.profileUrl : null) ||
                    buildProfileUrl(post.platform, competitor.name) ||
                    "#";

                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPostDetail(post)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#FF5722]/50 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer text-left"
                    >
                      {/* 1. Media Image Banner */}
                      {post.mediaUrl ? (
                        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.mediaUrl}
                            alt="Aperçu publication"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Platform & Date Badge */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-black/75 px-2 py-1 backdrop-blur-md text-[10px] font-bold text-white shadow-sm">
                            <HugeiconsIcon icon={PlatformIcon} className="size-3 text-white" />
                            <span className="capitalize">{post.platform}</span>
                            <span className="text-white/40">•</span>
                            <span>{timeAgo(post.publishedAt)}</span>
                          </div>

                          {/* External Link Icon */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(postTargetUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur-md transition-all group-hover:bg-[#FF5722] group-hover:scale-110"
                            title={`Ouvrir sur ${post.platform}`}
                          >
                            <ExternalLink className="size-3.5" />
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-[#0A0D14] to-slate-800 p-3.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white">
                              <HugeiconsIcon icon={PlatformIcon} className="size-3 text-[#FF5722]" />
                              <span className="capitalize">{post.platform}</span>
                              <span className="text-white/40">•</span>
                              <span>{timeAgo(post.publishedAt)}</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(postTargetUrl, "_blank", "noopener,noreferrer");
                              }}
                              className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-[#FF5722] transition-colors"
                              title={`Ouvrir sur ${post.platform}`}
                            >
                              <ExternalLink className="size-3" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                            Publication officielle
                          </span>
                        </div>
                      )}

                      {/* 2. Content snippet */}
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            {pubDate}
                          </span>
                          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-800 font-medium">
                            {stripRichTextFormatting(post.content) || "Consulter le contenu sur la page officielle du concurrent"}
                          </p>
                        </div>

                        {/* 3. Footer with metrics and direct action */}
                        <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Heart className="size-3.5 text-[#FF5722]" />
                                {post.likes}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <MessageCircle className="size-3.5 text-slate-500" />
                                {post.comments}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Share2 className="size-3.5 text-slate-500" />
                                {post.shares}
                              </span>
                            </div>

                            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF5722]">
                              {post.engagementRate > 0 ? `${post.engagementRate.toFixed(1)}% eng.` : "Actif"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-bold text-slate-900 group-hover:text-[#FF5722] transition-colors inline-flex items-center gap-1">
                              Voir le détail
                              <ChevronRight className="size-3" />
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/schedule?content=${encodeURIComponent(post.content.slice(0, 150))}`);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#FF5722] hover:text-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                              title="S'inspirer de cette idée dans KORAPULSE Studio"
                            >
                              <PenTool className="size-2.5" />
                              S&apos;inspirer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium text-slate-500">
                Affichage de <span className="font-bold text-slate-800">{(currentPage - 1) * POSTS_PER_PAGE + 1}</span> à{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * POSTS_PER_PAGE, displayedPosts.length)}
                </span>{" "}
                sur <span className="font-bold text-slate-800">{displayedPosts.length}</span> publications
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "size-8 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      currentPage === page
                        ? "bg-[#0A0D14] text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Suivant
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Modal Analyse & Recommandations Stratégiques KORAPULSE ── */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF5722] w-fit">
              <Layers className="size-3" />
              Audit Stratégique KORAPULSE
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 mt-2">
              Analyse &amp; Recommandations — {competitor.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Synthèse basée sur les publications publiques, la régularité et les volumes d&apos;interactions mesurés.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 mt-4">
            {/* Constats stratégiques (Noir & Orange luxury card) */}
            <div className="rounded-2xl border border-slate-800 bg-[#0A0D14] p-5 text-white shadow-lg">
              <h4 className="text-sm font-bold text-white">
                Constats sur la stratégie de {competitor.name}
              </h4>
              <ul className="mt-3 space-y-2.5 text-xs text-white/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF5722] font-bold mt-0.5">•</span>
                  <span>
                    <strong>Format privilégié :</strong> Publications avec visuels et photos de communication institutionnelle.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF5722] font-bold mt-0.5">•</span>
                  <span>
                    <strong>Volume détecté :</strong> {currentAllPosts.length} publication{currentAllPosts.length > 1 ? "s" : ""} identifiée{currentAllPosts.length > 1 ? "s" : ""} pour une audience de {displayedFollowers.toLocaleString("fr-FR")} abonnés.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF5722] font-bold mt-0.5">•</span>
                  <span>
                    <strong>Opportunité KORAPULSE :</strong> Développez des formats explicatifs pour capter davantage d&apos;interactions directes dans votre secteur.
                  </span>
                </li>
              </ul>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/60">Agir sur cette opportunité</span>
                <Link
                  href="/schedule"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5722] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#F4511E]"
                >
                  <Plus className="size-3.5" />
                  Créer un post concurrentiel
                </Link>
              </div>
            </div>

            {/* Calendrier éditorial */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Calendrier éditorial du concurrent
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Jours où des publications ont été enregistrées.
                  </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                  {formatMonth(currentMonth)}
                </span>
              </div>
              <div className="mt-4">
                <MiniCalendar
                  month={currentMonth}
                  posts={currentAllPosts}
                  availableMonths={availableMonths}
                  onMonthChange={setSelectedMonth}
                  selectedDay={selectedDay}
                  onSelectDay={(day) => {
                    setSelectedDay(day);
                    setIsAnalysisModalOpen(false);
                  }}
                />
              </div>
            </div>

            {/* Répartition des réactions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900">
                Répartition des réactions
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Typologie des {globalInteractions} interactions mesurées sur ce concurrent.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{
                      width: `${globalInteractions > 0 ? (globalLikes / globalInteractions) * 100 : 70}%`,
                    }}
                    className="bg-[#FF5722]"
                  />
                  <div
                    style={{
                      width: `${globalInteractions > 0 ? (globalComments / globalInteractions) * 100 : 20}%`,
                    }}
                    className="bg-slate-900"
                  />
                  <div
                    style={{
                      width: `${globalInteractions > 0 ? (globalShares / globalInteractions) * 100 : 10}%`,
                    }}
                    className="bg-slate-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                  <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 text-[11px]">
                      <span className="size-2 rounded-full bg-[#FF5722]" />
                      J&apos;aime
                    </span>
                    <span className="text-base font-bold text-slate-900">{globalLikes}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 text-[11px]">
                      <span className="size-2 rounded-full bg-slate-900" />
                      Commentaires
                    </span>
                    <span className="text-base font-bold text-slate-900">{globalComments}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 text-[11px]">
                      <span className="size-2 rounded-full bg-slate-400" />
                      Partages
                    </span>
                    <span className="text-base font-bold text-slate-900">{globalShares}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Modal */}
      <Dialog
        open={!!selectedPostDetail}
        onOpenChange={(open) => !open && setSelectedPostDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {selectedPostDetail && (() => {
            const PlatformIcon = ICON_MAP[selectedPostDetail.platform] || FacebookIcon;
            const platformObj = competitor.platforms.find((p) => p.platform === selectedPostDetail.platform);
            const postTargetUrl =
              selectedPostDetail.postUrl ||
              (platformObj ? buildProfileUrl(platformObj.platform, platformObj.handle) || platformObj.profileUrl : null) ||
              buildProfileUrl(selectedPostDetail.platform, competitor.name) ||
              "#";

            const pubDate = new Date(selectedPostDetail.publishedAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div className="flex flex-col">
                {/* Header */}
                <DialogHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-base shadow-sm">
                      {competitor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {competitor.name}
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          <HugeiconsIcon icon={PlatformIcon} className="size-3 text-slate-900" />
                          {selectedPostDetail.platform}
                        </span>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{pubDate}</span>
                        <span>•</span>
                        <span>{timeAgo(selectedPostDetail.publishedAt)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Media Image */}
                {selectedPostDetail.mediaUrl && (
                  <div className="relative w-full bg-slate-950 flex items-center justify-center max-h-[460px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPostDetail.mediaUrl}
                      alt="Publication visuel"
                      className="max-h-[460px] w-full object-contain"
                    />
                  </div>
                )}

                {/* Post Text Content */}
                <div className="p-6">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-normal select-text">
                    {stripRichTextFormatting(selectedPostDetail.content) ||
                      "Publication partagée sans légende textuelle."}
                  </p>

                  {/* Metrics Row */}
                  <div className="mt-6 grid grid-cols-4 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <Heart className="size-3.5 text-[#FF5722]" />
                        J&apos;aime
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-slate-900">
                        {selectedPostDetail.likes}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-l border-slate-200">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <MessageCircle className="size-3.5 text-slate-600" />
                        Commentaires
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-slate-900">
                        {selectedPostDetail.comments}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-l border-slate-200">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <Share2 className="size-3.5 text-slate-600" />
                        Partages
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-slate-900">
                        {selectedPostDetail.shares}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-l border-slate-200">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <TrendingUp className="size-3.5 text-[#FF5722]" />
                        Engagement
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-[#FF5722]">
                        {selectedPostDetail.engagementRate > 0
                          ? `${selectedPostDetail.engagementRate.toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer with Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `/schedule?content=${encodeURIComponent(
                          selectedPostDetail.content.slice(0, 300)
                        )}`
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors cursor-pointer shadow-xs"
                  >
                    <PenTool className="size-3.5" />
                    S&apos;inspirer dans le Studio
                  </button>

                  <a
                    href={postTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-[#FF5722] transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Consulter sur {selectedPostDetail.platform}</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
