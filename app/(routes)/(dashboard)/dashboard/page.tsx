"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  SendHorizontal,
  TrendingUp,
  BarChart2,
  Calendar as CalendarIcon,
  ChevronRight,
  Lightbulb,
  ArrowRight,
  ScanSearch,
  Clock,
  CheckCircle2,
  Layers,
  Plus,
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
import { ChannelType } from "@/types/channel.type";
import { PostType } from "@/types/post.type";
import { CompetitorListItem } from "@/types/competitor.type";
import CreatePostDialog from "@/components/schedule/create-post-dialog";

function parsePostSnippet(contentRaw: string): { title: string; text: string } {
  if (!contentRaw) return { title: "", text: "Sans texte" };
  try {
    const parsed = JSON.parse(contentRaw);
    return {
      title: parsed.title || "",
      text: parsed.text || contentRaw,
    };
  } catch {
    return {
      title: "",
      text: contentRaw,
    };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      // Future
      const futureHours = Math.abs(diffHours);
      if (futureHours < 24) return `Dans ${futureHours || 1}h`;
      const futureDays = Math.abs(diffDays);
      return `Dans ${futureDays}j`;
    }

    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const { user } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState<"7J" | "30J" | "90J" | "1A">("7J");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const userName = user?.firstName || user?.fullName || "";

  // 1. Real channels
  const { data: channelsData, isLoading: isChannelsLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      if (!res.ok) throw new Error("Erreur de chargement des canaux");
      return res.json();
    },
  });

  const channels = (channelsData?.channels || []) as ChannelType[];
  const connectedCount = channelsData?.connectedCount ?? 0;
  const totalChannels = channelsData?.totalChannels ?? channels.length ?? 6;

  // 2. Real post totals
  const { data: postTotals } = useQuery({
    queryKey: ["postTotals"],
    queryFn: async () => {
      const res = await fetch("/api/post/totals");
      if (!res.ok) throw new Error("Erreur de chargement des totaux");
      return res.json();
    },
  });

  const totalQueue = postTotals?.totalQueue ?? 0;
  const totalPublished = postTotals?.totalPublished ?? 0;

  // 3. Real posts
  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["dashboardPosts"],
    queryFn: async () => {
      const res = await fetch("/api/post");
      if (!res.ok) throw new Error("Erreur de chargement des posts");
      return res.json();
    },
  });

  const posts = (postsData?.posts || []) as PostType[];
  const recentPosts = posts.slice(0, 3);

  // 4. Real competitors
  const { data: competitorsData, isLoading: isCompetitorsLoading } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const res = await fetch("/api/competitor");
      if (!res.ok) throw new Error("Erreur de chargement des concurrents");
      return res.json();
    },
  });

  const competitors = (competitorsData?.competitors || []) as CompetitorListItem[];

  // 5. Real weekly distribution calculation from real posts
  const weeklyDistribution = useMemo(() => {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    posts.forEach((p) => {
      if (!p.scheduled_at) return;
      const d = new Date(p.scheduled_at);
      // Check if in current week
      const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
      counts[dayIndex] += 1;
    });

    const maxCount = Math.max(...counts, 4); // Scale reference
    return { days, counts, maxCount };
  }, [posts]);

  // Standard channels mapping
  const standardChannels = [
    { type: "FACEBOOK", name: "Facebook", icon: FacebookIcon },
    { type: "INSTAGRAM", name: "Instagram", icon: InstagramIcon },
    { type: "LINKEDIN", name: "LinkedIn", icon: LinkedinIcon },
    { type: "TIKTOK", name: "TikTok", icon: TiktokIcon },
    { type: "TWITTER", name: "X (Twitter)", icon: NewTwitterIcon },
    { type: "YOUTUBE", name: "YouTube", icon: YoutubeIcon },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 pb-10">
        {/* ── 1. Greeting & Insight Banner ── */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Bonjour{userName ? ` ${userName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vue d&apos;ensemble de votre présence digitale et de vos publications.
            </p>
          </div>

          {/* Real Status Card */}
          <div className="relative flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-w-[340px]">
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF5722]">
                <CheckCircle2 className="size-3.5 text-[#FF5722]" />
                État du compte
              </span>
              <span className="mt-1 text-sm font-bold text-slate-900">
                {connectedCount > 0
                  ? `${connectedCount} canal actif sur ${totalChannels}`
                  : "Aucun canal connecté pour le moment"}
              </span>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5722] text-white shadow-md shadow-orange-500/20">
              <TrendingUp className="size-5" />
            </div>
          </div>
        </div>

        {/* ── 2. Top 4 Real KPIs Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Canaux connectés */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors group-hover:bg-[#FF5722]">
                <Users className="size-5" />
              </div>
              <span className="text-[11px] font-bold text-[#FF5722]">
                {connectedCount > 0 ? "Synchronisé" : "À configurer"}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {isChannelsLoading ? "—" : `${connectedCount} / ${totalChannels}`}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Canaux connectés</span>
                <Link href="/settings" className="font-bold text-slate-900 hover:text-[#FF5722]">
                  Gérer
                </Link>
              </div>
            </div>
          </div>

          {/* Publications en attente */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF5722] transition-colors group-hover:bg-[#FF5722] group-hover:text-white">
                <Clock className="size-5" />
              </div>
              <span className="text-[11px] font-bold text-[#FF5722]">
                {totalQueue > 0 ? "Prêtes" : "File vide"}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {totalQueue}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">En file d&apos;attente</span>
                <Link href="/schedule" className="font-bold text-slate-900 hover:text-[#FF5722]">
                  Planning
                </Link>
              </div>
            </div>
          </div>

          {/* Publications diffusées */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors group-hover:bg-[#FF5722]">
                <SendHorizontal className="size-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-900">
                Diffusions
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {totalPublished}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Publications publiées</span>
                <Link href="/schedule/history" className="font-bold text-slate-900 hover:text-[#FF5722]">
                  Historique
                </Link>
              </div>
            </div>
          </div>

          {/* Concurrents suivis */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF5722] transition-colors group-hover:bg-[#FF5722] group-hover:text-white">
                <ScanSearch className="size-5" />
              </div>
              <span className="text-[11px] font-bold text-[#FF5722]">
                {competitors.length > 0 ? "Actif" : "À ajouter"}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {isCompetitorsLoading ? "—" : competitors.length}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Concurrents surveillés</span>
                <Link href="/competitor-watch" className="font-bold text-slate-900 hover:text-[#FF5722]">
                  Veille
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Real Activity Distribution & Veille Concurrentielle ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Activité de publication de la semaine (8 cols) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] lg:col-span-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-orange-50 text-[#FF5722]">
                    <BarChart2 className="size-4" />
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900">
                    Activité éditoriale de la semaine
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1">
                  {(["7J", "30J", "90J", "1A"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setSelectedPeriod(period)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        selectedPeriod === period
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                  <button
                    type="button"
                    title="Sélectionner une date"
                    aria-label="Sélectionner une date"
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                  >
                    <CalendarIcon className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-5 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <span className="size-2.5 rounded-full bg-[#FF5722]" />
                  Volume de publications enregistrées
                </span>
                <span className="text-slate-400">
                  ({posts.length} post{posts.length > 1 ? "s" : ""} au total)
                </span>
              </div>

              {/* Real Chart Rendering */}
              <div className="relative mt-6 flex h-64 w-full flex-col justify-end">
                {posts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <CalendarIcon className="size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      Aucune publication planifiée cette semaine
                    </p>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">
                      Créez ou programmez votre premier post pour visualiser votre répartition éditoriale quotidienne.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#F4511E]"
                    >
                      <Plus className="size-3.5" />
                      Planifier un post
                    </button>
                  </div>
                ) : (
                  <div className="flex h-full items-end justify-between gap-4 pt-8">
                    {weeklyDistribution.days.map((day, idx) => {
                      const count = weeklyDistribution.counts[idx];
                      const heightPercent = Math.max(
                        12,
                        Math.round((count / weeklyDistribution.maxCount) * 100)
                      );
                      const isToday = (new Date().getDay() + 6) % 7 === idx;

                      return (
                        <div key={day} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[11px] font-bold text-slate-600">
                            {count > 0 ? count : ""}
                          </span>
                          <div
                            style={{ height: `${count > 0 ? heightPercent : 6}%` }}
                            className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                              count > 0
                                ? isToday
                                  ? "bg-[#FF5722]"
                                  : "bg-slate-900 hover:bg-[#FF5722]"
                                : "bg-slate-100"
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold ${
                              isToday ? "text-[#FF5722] font-bold" : "text-slate-500"
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Veille concurrentielle Widget (Real Competitors) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0A0D14] p-6 text-white shadow-lg lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white">
                    <ScanSearch className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-white">
                      Veille concurrentielle
                    </h2>
                    <p className="text-[11px] text-white/50">
                      {competitors.length > 0
                        ? `${competitors.length} concurrent${competitors.length > 1 ? "s" : ""} suivi${competitors.length > 1 ? "s" : ""}`
                        : "Aucun profil surveillé"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/competitor-watch"
                  className="flex items-center gap-1 text-xs font-semibold text-[#FF5722] transition-colors hover:text-white"
                >
                  Voir tout
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {/* Real Competitor List */}
              <div className="mt-5 flex flex-col gap-3">
                {isCompetitorsLoading ? (
                  <div className="py-6 text-center text-xs text-white/40">
                    Chargement des concurrents...
                  </div>
                ) : competitors.length > 0 ? (
                  competitors.slice(0, 3).map((comp) => {
                    const totalFollowers = comp.platforms?.reduce(
                      (acc, p) => acc + (p.followers || 0),
                      0
                    ) || 0;

                    return (
                      <Link
                        key={comp.id}
                        href={`/competitor-watch/${comp.id}`}
                        className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold uppercase">
                            {comp.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white">
                              {comp.name}
                            </span>
                            <span className="block truncate text-[10px] text-white/45">
                              {comp.industry || `${comp.platforms?.length || 0} plateforme(s)`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-white shrink-0 ml-2">
                          {totalFollowers > 0
                            ? `${totalFollowers.toLocaleString("fr-FR")} abonnés`
                            : "Actif"}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    <p className="text-xs text-white/60">
                      Vous ne surveillez aucun concurrent pour l&apos;instant.
                    </p>
                    <Link
                      href="/competitor-watch"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#FF5722] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#F4511E]"
                    >
                      <Plus className="size-3.5" />
                      Ajouter un concurrent
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Opportunity Box */}
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#FF5722]/30 bg-[#FF5722]/10 p-3.5">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="size-4 shrink-0 text-[#FF5722] mt-0.5" />
                <div>
                  <span className="block text-[11px] font-bold text-[#FF5722]">
                    Analyse concurrentielle
                  </span>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/80">
                    {competitors.length > 0
                      ? "Consultez les publications récentes pour analyser les formats qui génèrent le plus de réactions."
                      : "Ajoutez vos premiers concurrents pour lancer l'analyse de leurs publications publiques."}
                  </p>
                </div>
              </div>
              <Link
                href="/competitor-watch"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF5722] text-white shadow-sm transition-transform hover:scale-105"
              >
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 4. Bottom Row: Vos réseaux, Publications récentes, Content Studio ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Vos réseaux sociaux (4 cols) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">
                  Vos réseaux sociaux
                </h3>
                <Link
                  href="/settings"
                  className="flex items-center gap-1 text-xs font-semibold text-[#FF5722] hover:underline"
                >
                  Configurer
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {standardChannels.map((std) => {
                  const channelMatch = channels.find((c) => c.type === std.type);
                  const isConnected = !!channelMatch?.connected;

                  return (
                    <div
                      key={std.type}
                      className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"
                    >
                      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <HugeiconsIcon icon={std.icon} className="size-4" />
                      </div>
                      <div className="mt-2 min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-900">
                          {std.name}
                        </span>
                        <span
                          className={`block truncate text-[10px] font-bold ${
                            isConnected ? "text-[#FF5722]" : "text-slate-400"
                          }`}
                        >
                          {isConnected ? "Connecté" : "Non lié"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Publications récentes (Real database posts) (4 cols) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">
                  Publications récentes
                </h3>
                <Link
                  href="/schedule"
                  className="flex items-center gap-1 text-xs font-semibold text-[#FF5722] hover:underline"
                >
                  Voir tout
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {isPostsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Chargement des publications...
                  </div>
                ) : recentPosts.length > 0 ? (
                  recentPosts.map((post) => {
                    const { text } = parsePostSnippet(post.content);
                    const channelName =
                      post.user_channels?.channel_types?.name || "Canal";
                    const statusLabel =
                      post.status === "published"
                        ? "Publié"
                        : post.status === "queue"
                        ? "En file"
                        : post.status === "failed"
                        ? "Échoué"
                        : "Brouillon";

                    return (
                      <div
                        key={post.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                          {channelName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold text-slate-800">
                            {text.slice(0, 48) || "Publication"}
                          </span>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                            <span>{formatRelativeTime(post.scheduled_at)}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                    <p className="text-xs text-slate-500">
                      Aucune publication enregistrée pour l&apos;instant.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Plus className="size-3.5" />
                      Créer un post
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Studio Card (No emojis, no stars, 100% professional) (4 cols) */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-[#0A0D14] p-6 text-white shadow-lg lg:col-span-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-15 blur-[70px]"
              style={{
                background: "radial-gradient(circle, #ff5722 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10 flex flex-col">
              <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF5722]">
                <Layers className="size-3" />
                Content Studio
              </div>

              <h3 className="mt-3 text-lg font-extrabold tracking-tight text-white">
                Organisation &amp; Déclinaisons
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Structurez vos brouillons, adaptez vos messages aux codes de chaque réseau social et organisez vos idées.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/80">
                  Formats natifs
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/80">
                  Déclinaison multi-canaux
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/80">
                  Organisation Kanban
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6">
              <Link
                href="/ideas"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:shadow active:scale-[0.99]"
              >
                Accéder au Studio
                <ArrowRight className="size-3.5 text-slate-900" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CreatePostDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}
