"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarClock, CircleAlert, Download, Eye, EyeOff, Filter, History, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChannelAvatar from "@/components/channel-avatar";
import { ChannelTypeEnum } from "@/constants/channels";
import { stripRichTextFormatting } from "@/lib/rich-text";

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
    return { label: "Échec", variant: "destructive" as const, icon: CircleAlert };
  }

  if (post.visibility_status === "visible") {
    return { label: "Visible", variant: "default" as const, icon: Eye };
  }

  if (post.visibility_status === "hidden") {
    return { label: "Non visible", variant: "secondary" as const, icon: EyeOff };
  }

  if (post.status === "published") {
    return { label: "À vérifier", variant: "secondary" as const, icon: Eye };
  }

  return { label: "Historique", variant: "outline" as const, icon: History };
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Archive</p>
          <h1 className="text-2xl font-semibold tracking-tight">Historique des publications</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/schedule">
              <ArrowLeft className="size-4" />
              Retour au planning
            </Link>
          </Button>
          <Button onClick={() => exportToCsv(filteredPosts)} variant="secondary" disabled={filteredPosts.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{analytics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Publiées</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{analytics.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Échec</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{analytics.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{analytics.rate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" />
            Filtres
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-2">
              {(["all", "published", "failed"] as const).map((value) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                >
                  {value === "all" ? "Tous" : value === "published" ? "Publiées" : "Échec"}
                </Button>
              ))}
            </div>

            <div className="ml-auto w-full max-w-xs">
              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">Tous les canaux</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Chargement de l’historique…</CardContent>
        </Card>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune publication trouvée</CardTitle>
            <CardDescription>Changez les filtres ou publiez une nouvelle story pour alimenter l’historique.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const channel = post.user_channels?.channel_types;
            const statusMeta = getStatusMeta(post);
            const StatusIcon = statusMeta.icon;
            const date = post.published_at ? parseISO(post.published_at) : parseISO(post.scheduled_at);
            const preview = stripRichTextFormatting(post.content || "") || "Aucun contenu";

            return (
              <Link key={post.id} href={`/schedule/history/${post.id}`} className="block">
                <Card className="overflow-hidden transition-colors hover:border-primary/40">
                  <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {channel ? (
                          <ChannelAvatar
                            type={channel.type as ChannelTypeEnum}
                            color={channel.color}
                            profileImage={post.user_channels?.profile_image}
                            name={post.user_channels?.handle || channel.name}
                          />
                        ) : null}

                        <Badge variant={statusMeta.variant} className="flex items-center gap-1.5">
                          <StatusIcon className="size-3" />
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {format(date, "d MMMM yyyy", { locale: fr })}
                        </p>
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                          {preview}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarClock className="size-4" />
                        <span>{format(date, "d MMM yyyy, HH:mm", { locale: fr })}</span>
                      </div>

                      {post.published_url ? (
                        <Button asChild variant="outline" className="w-full justify-between">
                          <a href={post.published_url} target="_blank" rel="noreferrer noopener">
                            <span>Voir la publication</span>
                            <ArrowUpRight className="size-4" />
                          </a>
                        </Button>
                      ) : (
                        <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                          Aucun lien public
                        </div>
                      )}

                      {post.provider_owner_type || post.provider_owner_id ? (
                        <div className="rounded-md border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Link2 className="size-3.5" />
                            Propriétaire
                          </div>
                          <p className="mt-1">
                            {post.provider_owner_type || "Compte"} · {post.provider_owner_id || "inconnu"}
                          </p>
                        </div>
                      ) : null}

                      <div className="pt-2 text-xs font-medium text-primary">Voir le détail →</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
