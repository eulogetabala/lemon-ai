"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarClock, CircleAlert, Eye, EyeOff, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChannelAvatar from "@/components/channel-avatar";
import { ChannelTypeEnum } from "@/constants/channels";
import { stripRichTextFormatting } from "@/lib/rich-text";

type PostDetail = {
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
  provider_response?: Record<string, unknown> | null;
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

const getStatusMeta = (post: PostDetail) => {
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

  return { label: "Historique", variant: "outline" as const, icon: CalendarClock };
};

export default function ScheduleHistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/post/${params.id}`);
        if (!res.ok) throw new Error("Impossible de charger la publication");
        const data = await res.json();
        setPost(data.post as PostDetail);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      load();
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement de la publication…</div>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Publication introuvable</CardTitle>
            <CardDescription>Cette publication n’existe plus ou n’est plus accessible.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const channel = post.user_channels?.channel_types;
  const statusMeta = getStatusMeta(post);
  const StatusIcon = statusMeta.icon;
  const date = post.published_at ? parseISO(post.published_at) : parseISO(post.scheduled_at);
  const preview = stripRichTextFormatting(post.content || "") || "Aucun contenu";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/schedule/history">
            <ArrowLeft className="size-4" />
            Retour à l’historique
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 border-b">
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

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Publication</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Détail de la publication</h1>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                Date de publication
              </div>
              <p className="text-base font-medium">{format(date, "d MMMM yyyy, HH:mm", { locale: fr })}</p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="size-4" />
                Lien public
              </div>
              {post.published_url ? (
                <Button asChild variant="outline" className="w-full justify-between">
                  <a href={post.published_url} target="_blank" rel="noreferrer noopener">
                    <span>Ouvrir la publication</span>
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun lien public disponible</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Contenu</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{preview}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Propriétaire</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Type :</span> {post.provider_owner_type || "Inconnu"}</p>
                <p><span className="text-muted-foreground">ID :</span> {post.provider_owner_id || "Inconnu"}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Visibilité</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Statut :</span> {post.status}</p>
                <p><span className="text-muted-foreground">Visibilité :</span> {post.visibility_status ?? "unknown"}</p>
                <p><span className="text-muted-foreground">Publish status :</span> {post.publish_status ?? "pending"}</p>
              </div>
            </div>
          </div>

          {post.error_message ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {post.error_message}
            </div>
          ) : null}

          {post.provider_response ? (
            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Réponse provider</h3>
              <pre className="overflow-auto whitespace-pre-wrap text-xs text-foreground/80">
                {JSON.stringify(post.provider_response, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
