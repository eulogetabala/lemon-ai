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
  RotateCcw,
  ChevronDown,
  BadgeCheck,
  Tag,
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
import { formatNumber, formatMonth, pctChange, timeAgo } from "../_data";
import {
  CompetitorHeader,
  CountUp,
  FeaturedPost,
  MonthSummary,
  PulseCard,
  SourceNotice,
  PLATFORM_LABEL,
  PostCard,
  fr,
  interactionsOf,
  pct,
  signed,
  type Metric,
} from "./_parts";
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

/** Used as a tie-break when several channels have the same number of posts. */
const DEFAULT_CHANNEL_ORDER = ["instagram", "linkedin", "facebook", "tiktok", "youtube", "twitter", "threads"];

const channelRank = (platform: string) => {
  const index = DEFAULT_CHANNEL_ORDER.indexOf(platform);
  return index === -1 ? DEFAULT_CHANNEL_ORDER.length : index;
};

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<CompetitorDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [platformChoice, setPlatformChoice] = useState<{ id: string; platform: string } | null>(null);
  const [viewFilter, setViewFilter] = useState<"all" | "month">("month");
  const [sortBy, setSortBy] = useState<"recent" | "engaging">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState<CompetitorPost | null>(null);

  const POSTS_PER_PAGE = 9;

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

  // Land on a single channel: the same publication cross-posted on several
  // networks would otherwise appear several times in the flux. The user can
  // still switch to another channel or to "Tous" from the tabs.
  const defaultPlatform = useMemo(() => {
    const countByChannel = (list: CompetitorPost[]) => {
      const counts = new Map<string, number>();
      for (const post of list) counts.set(post.platform, (counts.get(post.platform) ?? 0) + 1);
      return counts;
    };
    // Prefer a channel that actually published on the month being viewed, so the
    // landing view is never empty when another channel has posts.
    const monthCounts = countByChannel(posts);
    const allCounts = countByChannel(allPosts);
    return [...platforms].sort((a, b) => {
      const monthDelta = (monthCounts.get(b.platform) ?? 0) - (monthCounts.get(a.platform) ?? 0);
      if (monthDelta !== 0) return monthDelta;
      const allDelta = (allCounts.get(b.platform) ?? 0) - (allCounts.get(a.platform) ?? 0);
      if (allDelta !== 0) return allDelta;
      return channelRank(a.platform) - channelRank(b.platform);
    })[0]?.platform;
  }, [platforms, posts, allPosts]);

  const platformOverride = platformChoice && platformChoice.id === id ? platformChoice.platform : null;
  const selectedPlatform = platformOverride ?? defaultPlatform ?? "all";

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
    if (sortBy === "engaging") {
      list = [...list].sort((a, b) => interactionsOf(b) - interactionsOf(a));
    }
    return list;
  }, [currentAllPosts, currentMonthPosts, viewFilter, selectedDay, currentMonth, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform, viewFilter, selectedDay, selectedMonth, sortBy]);

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

      const postsToExport = viewFilter === "all" ? allPosts : posts;
      const filteredPosts = targetPlat
        ? postsToExport.filter((p) => p.platform === targetPlat)
        : postsToExport;

      const activePlatObj = targetPlat
        ? comp.platforms.find((p) => p.platform === targetPlat)
        : undefined;

      const filteredStats = targetPlat
        ? (viewFilter === "all" ? (detail.allStats ?? detail.stats) : detail.stats).filter((s) => s.platform === targetPlat)
        : (viewFilter === "all" ? (detail.allStats ?? detail.stats) : detail.stats);

      const reportData: CompetitorReportData = {
        competitorName: comp.name,
        channelName: targetPlat ? targetPlat.charAt(0).toUpperCase() + targetPlat.slice(1) : null,
        channelHandle: activePlatObj?.handle ? usernameFromHandle(activePlatObj.handle) : null,
        industry: comp.industry,
        website: comp.website,
        period: viewFilter === "all" ? "Historique complet" : formatMonth(currentMonth),
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
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3" role="status">
        <RefreshCw className="size-6 animate-spin text-[#FF5722]" />
        <span className="text-sm font-medium text-slate-500">Chargement de la fiche concurrent…</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-base font-bold text-slate-900">Ce concurrent n&apos;existe plus ou a été supprimé.</p>
        <Link
          href="/competitor-watch"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
        >
          <ArrowLeft className="size-4" />
          Retour à la veille concurrentielle
        </Link>
      </div>
    );
  }

  const { competitor, availableMonths, stats, prevStats } = detail;
  const scope = <T extends { platform: string }>(rows: T[]) =>
    selectedPlatform === "all" ? rows : rows.filter((r) => r.platform === selectedPlatform);

  const totalFollowers = competitor.platforms.reduce((sum, p) => sum + p.followers, 0);
  const displayedFollowers = currentPlatforms.reduce((sum, p) => sum + p.followers, 0);
  const followersByPlatform = new Map(competitor.platforms.map((p) => [p.platform, p.followers]));
  const activePlatformObj = competitor.platforms.find((p) => p.platform === selectedPlatform);
  const isLiveMonth = currentMonth === detail.month && availableMonths[0] === currentMonth;

  // ── Month metrics (scoped to the selected channel) ──
  const sumPosts = (list: CompetitorPost[]) => ({
    likes: list.reduce((a, p) => a + p.likes, 0),
    comments: list.reduce((a, p) => a + p.comments, 0),
    shares: list.reduce((a, p) => a + p.shares, 0),
  });
  const month = sumPosts(currentMonthPosts);
  const monthInteractions = month.likes + month.comments + month.shares;
  const monthPostCount = currentMonthPosts.length;

  const prevScoped = scope(prevStats);
  const prevPostCount = prevScoped.reduce((a, s) => a + s.posts, 0);
  const prevInteractions = prevScoped.reduce((a, s) => a + s.likes + s.comments + s.shares, 0);

  // Engagement = average interactions per post / audience of that channel.
  const postEngagement = (p: CompetitorPost) => {
    const f = followersByPlatform.get(p.platform) ?? 0;
    return f > 0 ? (interactionsOf(p) / f) * 100 : null;
  };
  const engagementOf = (posts: number, interactions: number) =>
    posts > 0 && displayedFollowers > 0 ? (interactions / posts / displayedFollowers) * 100 : null;
  const monthEngagement = engagementOf(monthPostCount, monthInteractions);
  const prevEngagement = engagementOf(prevPostCount, prevInteractions);

  const scopedStats = scope(stats);
  const growthRows = scopedStats.filter((s) => typeof s.newFollowers === "number");
  const newFollowers = growthRows.length > 0 ? growthRows.reduce((a, s) => a + (s.newFollowers ?? 0), 0) : null;
  const sinceTrackingStart = growthRows.some((s) => s.followersBasis === "tracking_start");
  const prevGrowthRows = prevScoped.filter((s) => typeof s.newFollowers === "number");
  const prevNewFollowers = prevGrowthRows.length > 0 ? prevGrowthRows.reduce((a, s) => a + (s.newFollowers ?? 0), 0) : null;

  const lastSync = competitor.platforms
    .map((p) => p.syncedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const updatedLabel = lastSync ? `mis à jour ${timeAgo(lastSync as string).toLowerCase()}` : null;

  const monthName = formatMonth(currentMonth).split(" ")[0];
  const trackingStart = currentPlatforms.map((p) => p.connectedAt).filter(Boolean).sort()[0] ?? competitor.connectedAt;
  const trackingStartLabel = trackingStart
    ? new Date(trackingStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "";
  const scopeName =
    selectedPlatform === "all" ? competitor.name : `${competitor.name} sur ${PLATFORM_LABEL[selectedPlatform] ?? selectedPlatform}`;
  const headline = (
    <>
      {isLiveMonth ? `Depuis le 1er ${monthName}, ` : `En ${monthName}, `}
      <strong>{scopeName}</strong>{" "}
      {newFollowers !== null && newFollowers !== 0 && (
        <>
          a {newFollowers > 0 ? "gagné" : "perdu"} <em><CountUp value={newFollowers} format={signed} /></em> abonnés
          {sinceTrackingStart ? " depuis le début du suivi" : ""},{" "}
        </>
      )}
      {monthPostCount > 0 ? (
        <>
          a publié <strong><CountUp value={monthPostCount} /> post{monthPostCount > 1 ? "s" : ""}</strong> et récolté{" "}
          <strong><CountUp value={monthInteractions} /></strong> interactions.
        </>
      ) : (
        <>n&apos;a rien publié pour l&apos;instant.</>
      )}
    </>
  );

  const metrics: Metric[] = [
    {
      label: "Abonnés",
      value: displayedFollowers > 0 ? displayedFollowers : null,
      detail: displayedFollowers > 0 ? "Total actuel" : "Audience non disponible",
    },
    {
      label: `Nouveaux abonnés en ${monthName}`,
      value: newFollowers,
      format: signed,
      delta:
        newFollowers !== null && prevNewFollowers !== null && prevNewFollowers !== 0
          ? { text: `${pctChange(newFollowers, prevNewFollowers) >= 0 ? "+" : ""}${pctChange(newFollowers, prevNewFollowers)} %`, positive: newFollowers >= prevNewFollowers }
          : null,
      detail:
        newFollowers === null
          ? "Calculé dès le prochain relevé"
          : sinceTrackingStart
            ? `Depuis le début du suivi (${trackingStartLabel})`
            : "Depuis le 1er du mois",
    },
    {
      label: "Publications",
      value: monthPostCount,
      delta: null,
      detail: prevPostCount > 0 ? `${prevPostCount} le mois précédent` : undefined,
    },
    {
      label: "J'aime",
      value: month.likes,
      detail: monthPostCount > 0 ? `${fr(month.likes / monthPostCount)} par post` : undefined,
    },
    {
      label: "Commentaires et partages",
      value: month.comments + month.shares,
      detail: `${fr(month.comments)} com., ${fr(month.shares)} partages`,
    },
    {
      label: "Taux d'engagement",
      value: monthEngagement,
      format: (n: number) => pct(n),
      delta:
        monthEngagement !== null && prevEngagement !== null
          ? {
              text: `${monthEngagement >= prevEngagement ? "+" : "−"}${Math.abs(monthEngagement - prevEngagement).toFixed(2).replace(".", ",")}`,
              positive: monthEngagement === prevEngagement ? null : monthEngagement > prevEngagement,
            }
          : null,
      detail: "Par post, rapporté aux abonnés",
    },
  ];

  const topPost =
    currentMonthPosts.length > 0
      ? currentMonthPosts.reduce((best, p) => (interactionsOf(p) > interactionsOf(best) ? p : best))
      : null;

  const postUrlOf = (post: CompetitorPost) => {
    const platformObj = competitor.platforms.find((p) => p.platform === post.platform);
    return (
      post.postUrl ||
      (platformObj ? buildProfileUrl(platformObj.platform, platformObj.handle) || platformObj.profileUrl : null) ||
      "#"
    );
  };
  const inspire = (post: CompetitorPost) =>
    router.push(`/schedule?content=${encodeURIComponent(stripRichTextFormatting(post.content).slice(0, 150))}`);

  // ── Facts for the analysis dialog (all derived from collected posts) ──
  const withMedia = currentAllPosts.filter((p) => p.mediaUrl).length;
  const mediaShare = currentAllPosts.length > 0 ? Math.round((withMedia / currentAllPosts.length) * 100) : 0;
  const weekdayTotals = Array.from({ length: 7 }, () => ({ posts: 0, interactions: 0 }));
  for (const p of currentAllPosts) {
    const w = weekdayTotals[new Date(p.publishedAt).getDay()];
    w.posts += 1;
    w.interactions += interactionsOf(p);
  }
  const bestWeekday = weekdayTotals
    .map((w, i) => ({ i, avg: w.posts > 0 ? w.interactions / w.posts : 0 }))
    .sort((a, b) => b.avg - a.avg)[0];
  const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const globalLikes = currentAllPosts.reduce((acc, p) => acc + p.likes, 0);
  const globalComments = currentAllPosts.reduce((acc, p) => acc + p.comments, 0);
  const globalShares = currentAllPosts.reduce((acc, p) => acc + p.shares, 0);
  const globalInteractions = globalLikes + globalComments + globalShares;

  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5722]";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col pb-14">
      {/* ── Top bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/competitor-watch"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="size-4" />
          Veille concurrentielle
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSync} disabled={isSyncing} className={btn}>
            <RefreshCw className={cn("size-3.5 text-slate-400", isSyncing && "animate-spin")} />
            {isSyncing ? "Actualisation…" : "Actualiser"}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenu((v) => !v)}
              disabled={isExporting}
              aria-expanded={exportMenu}
              className={btn}
            >
              <FileDown className={cn("size-3.5 text-slate-400", isExporting && "animate-pulse")} />
              {isExporting ? "Génération…" : "Rapport"}
              <ChevronDown className={cn("size-3 transition-transform", exportMenu && "rotate-180")} />
            </button>

            {exportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs font-semibold text-slate-400">Rapport de {formatMonth(currentMonth)}</p>
                  {[{ key: "all", label: "Tous les réseaux" }, ...competitor.platforms.map((p) => ({ key: p.platform, label: PLATFORM_LABEL[p.platform] ?? p.platform }))].map((row) => (
                    <div key={row.key} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-50">
                      <span className="text-sm font-semibold text-slate-800">{row.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExport("pdf", row.key)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722]"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport("pptx", row.key)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-[#FF5722] hover:text-[#FF5722]"
                        >
                          PPTX
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAnalysisModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5722]"
          >
            Analyse avancée
          </button>
        </div>
      </div>

      {/* ── Identity + channel switcher ── */}
      <div className="mb-6">
        <CompetitorHeader
          name={competitor.name}
          verified={competitor.verified}
          avatar={(activePlatformObj ?? competitor.platforms.find((p) => p.profileImage))?.profileImage ?? null}
          subtitle={
            <>
              {competitor.industry && <span>{competitor.industry}</span>}
              {activePlatformObj ? (
                <a
                  href={buildProfileUrl(activePlatformObj.platform, activePlatformObj.handle) || activePlatformObj.profileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900"
                >
                  @{usernameFromHandle(activePlatformObj.handle)}
                </a>
              ) : (
                <span>
                  {competitor.platforms.length} canal{competitor.platforms.length > 1 ? "aux" : ""} suivi{competitor.platforms.length > 1 ? "s" : ""}
                </span>
              )}
              {competitor.website && (
                <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">
                  {competitor.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
            </>
          }
          tabs={[
            { key: "all", label: "Tous", followers: totalFollowers },
            ...competitor.platforms.map((p) => ({ key: p.platform as string, label: PLATFORM_LABEL[p.platform] ?? p.platform, followers: p.followers })),
          ]}
          selected={selectedPlatform}
          onSelect={(key) => {
            setPlatformChoice({ id, platform: key });
            setSelectedDay(null);
          }}
        />
      </div>

      {/* ── Month pulse + summary ── */}
      <div className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PulseCard
            month={currentMonth}
            posts={currentMonthPosts}
            availableMonths={availableMonths}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              setSelectedDay(null);
              setViewFilter("month");
            }}
            selectedDay={selectedDay}
            onSelectDay={(d) => {
              setSelectedDay(d);
              if (d !== null) {
                setViewFilter("month");
                document.getElementById("flux")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            headline={headline}
            updatedLabel={updatedLabel}
            live={isLiveMonth}
            animationKey={`${currentMonth}-${selectedPlatform}`}
          />
        </div>
        <div className="lg:col-span-4">
          <MonthSummary
            title={`Bilan de ${formatMonth(currentMonth)}`}
            metrics={metrics}
            animationKey={`${currentMonth}-${selectedPlatform}`}
          />
        </div>
      </div>

      {/* ── Meilleure publication du mois ── */}
      {topPost && (
        <section className="mb-10" aria-labelledby="top-post-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="top-post-title" className="text-[15px] font-bold text-slate-900">
              Meilleure publication du mois
            </h2>
            <button
              type="button"
              onClick={() => setIsAnalysisModalOpen(true)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Voir l&apos;analyse complète
            </button>
          </div>
          <FeaturedPost
            post={topPost}
            url={postUrlOf(topPost)}
            engagement={postEngagement(topPost)}
            onOpen={() => setSelectedPostDetail(topPost)}
            onInspire={() => inspire(topPost)}
          />
        </section>
      )}

      {/* ── Flux des publications ── */}
      <section id="flux" className="scroll-mt-6" aria-labelledby="flux-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="flux-title" className="text-[15px] font-bold text-slate-900">
              Flux des publications
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectedDay !== null
                ? `${displayedPosts.length} publication${displayedPosts.length > 1 ? "s" : ""} le ${selectedDay} ${formatMonth(currentMonth)}.`
                : viewFilter === "month"
                  ? `${displayedPosts.length} publication${displayedPosts.length > 1 ? "s" : ""} en ${formatMonth(currentMonth)}.`
                  : `${displayedPosts.length} publication${displayedPosts.length > 1 ? "s" : ""} collectée${displayedPosts.length > 1 ? "s" : ""} depuis le début du suivi.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
              {([["month", "Ce mois"], ["all", "Tout l'historique"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={viewFilter === key && selectedDay === null}
                  onClick={() => {
                    setViewFilter(key);
                    setSelectedDay(null);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    viewFilter === key && selectedDay === null ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
              {([["recent", "Plus récents"], ["engaging", "Plus engageants"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    sortBy === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {displayedPosts.length === 0 ? (
          <SourceNotice
            sources={currentPlatforms.map((p) => ({ platform: p.platform, note: p.lastError ?? null }))}
            onSync={handleSync}
            syncing={isSyncing}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedPosts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                delay={i * 40}
                engagement={postEngagement(post)}
                onOpen={() => setSelectedPostDetail(post)}
                onInspire={() => inspire(post)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row">
            <p className="text-sm text-slate-500">
              {(currentPage - 1) * POSTS_PER_PAGE + 1}–{Math.min(currentPage * POSTS_PER_PAGE, displayedPosts.length)} sur {displayedPosts.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={btn}
              >
                <ChevronLeft className="size-3.5" /> Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-current={currentPage === page ? "page" : undefined}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "size-8 rounded-lg text-xs font-bold transition-colors",
                    currentPage === page ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={btn}
              >
                Suivant <ChevronRight className="size-3.5" />
              </button>
            </div>
          </nav>
        )}
      </section>

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
                    <strong>Format :</strong> {mediaShare} % des publications collectées contiennent un visuel.
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
                    <strong>Meilleur jour :</strong>{" "}
                    {bestWeekday && bestWeekday.avg > 0
                      ? `le ${WEEKDAYS[bestWeekday.i]}, avec ${fr(bestWeekday.avg)} interactions par post en moyenne.`
                      : "pas encore assez de publications pour le déterminer."}
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
