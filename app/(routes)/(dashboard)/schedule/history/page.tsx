"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarClock, CircleAlert, Download, Eye, EyeOff, Filter, History, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import ChannelAvatar from "@/components/channel-avatar";
import { ChannelTypeEnum } from "@/constants/channels";
import { stripRichTextFormatting } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type ChannelOption = {
  id: string;
  type: string;
  name: string;
  color: string;
  connected: boolean;
};

type HistoryPost = {
  id: string;
  content: string;
  status: string;
  publish_status?: string | null;
  visibility_status?: string | null;
  scheduled_at: string;
  published_at?: string | null;
  published_url?: string | null;
  error_message?: string | null;
  provider_owner_type?: string | null;
  provider_owner_id?: string | null;
  user_channels?: {
    handle?: string | null;
    profile_image?: string | null;
    channel_types?: {
      id: string;
      type: string;
      name: string;
      color: string;
    } | null;
  } | null;
};

const getStatusMeta = (post: HistoryPost) => {
  if (post.status === "failed" || post.publish_status === "failed") {
    return { label: "Échec", dotColor: "bg-stamp", textColor: "text-stamp", bgColor: "bg-stamp/8 border-stamp/25", icon: CircleAlert };
  }
  if (post.visibility_status === "visible") {
    return { label: "Visible", dotColor: "bg-[#27C93F]", textColor: "text-moss", bgColor: "bg-[#27C93F]/8 border-[#27C93F]/25", icon: Eye };
  }
  if (post.visibility_status === "hidden") {
    return { label: "Non visible", dotColor: "bg-mute", textColor: "text-mute", bgColor: "bg-mist border-hairline", icon: EyeOff };
  }
  if (post.status === "published") {
    return { label: "À vérifier", dotColor: "bg-mute", textColor: "text-mute", bgColor: "bg-mist border-hairline", icon: Eye };
  }
  return { label: "Historique", dotColor: "bg-lemon", textColor: "text-moss", bgColor: "bg-lemon/8 border-lemon/25", icon: History };
};

const exportToCsv = (posts: HistoryPost[]) => {
  const rows = posts.map((post) => ({
    id: post.id,
    canal: post.user_channels?.channel_types?.name ?? "Inconnu",
    type: post.user_channels?.channel_types?.type ?? "",
    statut: post.status,
    visibilite: post.visibility_status ?? "unknown",
    date: post.published_at ?? post.scheduled_at,
    lien: post.published_url ?? "",
    contenu: (stripRichTextFormatting(post.content || "") || "").replace(/\n/g, " ").replace(/"/g, '""'),
  }));

  const headers = ["id", "canal", "type", "statut", "visibilite", "date", "lien", "contenu"];
  const csv = [headers.join(","), ...rows.map((row) =>
    headers.map((header) => `"${String((row as Record<string, string>)[header] ?? "")}"`).join(",")
  )].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "historique-publications.csv";
  link.click();
  URL.revokeObjectURL(url);
};

export default function ScheduleHistoryPage() {
  const [posts, setPosts] = useState<HistoryPost[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "failed">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [postsRes, channelsRes] = await Promise.all([
          fetch("/api/post"),
          fetch("/api/channel?filter=connected"),
        ]);

        if (!postsRes.ok || !channelsRes.ok) throw new Error("Impossible de charger les données");

        const postsData = await postsRes.json();
        const channelsData = await channelsRes.json();

        setPosts((postsData.posts ?? []) as HistoryPost[]);
        setChannels((channelsData.channels ?? []) as ChannelOption[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredPosts = useMemo(() => {
    return (posts || []).filter((post) => {
      const matchesStatus = statusFilter === "all" ? true : post.status === statusFilter;
      const matchesChannel = channelFilter === "all" ? true : post.user_channels?.channel_types?.id === channelFilter;
      return matchesStatus && matchesChannel;
    });
  }, [posts, statusFilter, channelFilter]);

  const analytics = useMemo(() => {
    const published = filteredPosts.filter((post) => post.status === "published").length;
    const failed = filteredPosts.filter((post) => post.status === "failed").length;
    const visible = filteredPosts.filter((post) => post.visibility_status === "visible").length;
    const total = filteredPosts.length;

    return {
      total,
      published,
      failed,
      visible,
      rate: total > 0 ? Math.round((published / total) * 100) : 0,
    };
  }, [filteredPosts]);

  const statCards = [
    { label: "Total", value: analytics.total, accent: "border-hairline" },
    { label: "Publiées", value: analytics.published, accent: "border-[#27C93F]/30" },
    { label: "Échecs", value: analytics.failed, accent: "border-stamp/30", valueColor: "text-stamp" },
    { label: "Taux", value: `${analytics.rate}%`, accent: "border-lemon/30", valueColor: "text-moss" },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 py-2 px-1">
      {/* ── Header — Studio Editorial ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
            <History className="size-[18px] text-moss" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Historique des publications</h1>
            <p className="text-[13px] text-mute mt-0.5">Archive complète · {posts.length} publications</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full border-hairline text-mute hover:text-ink hover:border-lemon/30 transition-all h-9 px-4 text-xs font-semibold">
            <Link href="/schedule">
              <ArrowLeft className="size-3.5" />
              Retour au planning
            </Link>
          </Button>
          <Button
            onClick={() => exportToCsv(filteredPosts)}
            disabled={filteredPosts.length === 0}
            className="rounded-full h-9 px-4 text-xs font-bold bg-ink text-lemon hover:bg-ink/90 transition-all"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stats — editorial tiles ── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={cn(
            "rounded-2xl border bg-white dark:bg-card p-4",
            stat.accent
          )}>
            <p className="tag-code text-mute">{stat.label}</p>
            <p className={cn("text-3xl font-extrabold tracking-tight mt-2", stat.valueColor || "text-ink")}>
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters — pill style ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white dark:bg-card p-4 md:flex-row md:items-center">
        <div className="flex items-center gap-1.5 text-mute">
          <Filter className="size-3.5" />
          <span className="tag-code">Filtres</span>
        </div>

        <div className="flex flex-wrap gap-2 md:ml-2">
          {(["all", "published", "failed"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-bold transition-all duration-200",
                statusFilter === value
                  ? "bg-ink text-lemon"
                  : "border border-hairline bg-white dark:bg-card text-mute hover:bg-mist hover:text-ink"
              )}
            >
              {value === "all" ? "Toutes" : value === "published" ? "Publiées" : "Échecs"}
            </button>
          ))}
        </div>

        <div className="md:ml-auto">
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            className="flex h-8 w-full rounded-full border border-hairline bg-white dark:bg-card px-3 py-1 text-[12px] font-semibold text-ink outline-none focus:border-lemon/40 transition-colors min-w-[160px]"
          >
            <option value="all">Tous les canaux</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>{channel.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-hairline bg-mist/20 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-mist/10">
          <p className="font-bold text-ink">Aucune publication trouvée</p>
          <p className="text-sm text-mute">Changez les filtres ou publiez une nouvelle story pour alimenter l'historique.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const channel = post.user_channels?.channel_types;
            const statusMeta = getStatusMeta(post);
            const StatusIcon = statusMeta.icon;
            const date = post.published_at ? parseISO(post.published_at) : parseISO(post.scheduled_at);
            const preview = stripRichTextFormatting(post.content || "") || "Aucun contenu";

            return (
              <Link key={post.id} href={`/schedule/history/${post.id}`} className="group block">
                <div className={cn(
                  "rounded-2xl border overflow-hidden transition-all duration-200",
                  "border-hairline bg-white dark:bg-card",
                  "hover:border-lemon/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(198,255,26,0.15)]"
                )}>
                  {/* Top accent line */}
                  <div className="h-[2px] w-full post-card-accent" />

                  <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_200px] md:items-start">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {channel ? (
                          <ChannelAvatar
                            type={channel.type as ChannelTypeEnum}
                            color={channel.color}
                            profileImage={post.user_channels?.profile_image}
                            name={post.user_channels?.handle || channel.name}
                          />
                        ) : null}

                        {/* Status pill */}
                        <div className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                          statusMeta.bgColor
                        )}>
                          <span className={cn("size-1.5 rounded-full", statusMeta.dotColor)} />
                          <span className={cn("tag-code", statusMeta.textColor)}>{statusMeta.label}</span>
                        </div>
                      </div>

                      <div>
                        <p className="tag-code text-mute mb-1">
                          {format(date, "d MMMM yyyy", { locale: fr })}
                        </p>
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                          {preview}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-hairline bg-mist/20 p-4">
                      <div className="flex items-center gap-1.5 text-xs text-mute">
                        <CalendarClock className="size-3.5" />
                        <span>{format(date, "d MMM yyyy, HH:mm", { locale: fr })}</span>
                      </div>

                      {post.published_url ? (
                        <a
                          href={post.published_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center justify-between w-full rounded-xl border border-hairline bg-white dark:bg-card px-3 py-2 text-xs font-semibold text-ink hover:border-lemon/30 hover:bg-lemon/5 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Voir la publication</span>
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      ) : (
                        <div className="rounded-xl border border-dashed border-hairline px-3 py-2 text-xs text-mute">
                          Aucun lien public
                        </div>
                      )}

                      <div className="tag-code text-moss group-hover:text-ink transition-colors">
                        Voir le détail →
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
