import { PostType } from "@/types/post.type";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import ScheduleToolbar from "./schedule-toolbar";
import { Skeleton } from "../ui/skeleton";
import { AlarmClockCheck, ExternalLink, LayoutList, Pin, Plus, Send, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardFooter } from "../ui/card";
import ChannelAvatar from "../channel-avatar";
import { EditPostDialog } from "./edit-post-dialog";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";
import { cn } from "@/lib/utils";
import { stripRichTextFormatting } from "@/lib/rich-text";

type TabType = "draft" | "queue" | "published" | "failed";

type GroupPostType = {
  key: string;
  label: string;
  posts: PostType[]
}

const ListView = ({ setCreatePostModalOpen }: {
  setCreatePostModalOpen: (open: boolean) => void
}) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useQueryState("status", {
    defaultValue: "draft"
  })
  const [channelIds, setChannelIds] = useQueryState("channelIds", {
    defaultValue: [],
    parse: (query) => query.split(","),
    serialize: (value) => value.join(",")
  })

  const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // const { data, isFetching:isPending } = useQuery({
  //   queryKey: ["posts", activeTab, channelIds],
  //   queryFn: async () => {
  //     const params = new URLSearchParams()
  //     params.append("group_by_date", "true")
  //     if (activeTab) params.append("status", activeTab)
  //     if (channelIds.length > 0) params.append("channelIds", channelIds.join(","))
  //     const res = await fetch(`/api/post?${params.toString()}`);
  //     if (!res.ok) throw new Error("Failed to fetch posts");
  //     return res.json();
  //   },
  // })

  //  const { data:totalPosts } = useQuery({
  //   queryKey: ["posts", "totals", channelIds],
  //   queryFn: async () => {
  //     const params = new URLSearchParams()
  //     if (channelIds.length > 0) params.append("channelIds", channelIds.join(","))
  //     const res = await fetch(`/api/post/totals?${params.toString()}`);
  //     if (!res.ok) throw new Error("Failed to fetch posts");
  //     return res.json();
  //   }
  // })

  const [postsQuery, totalsQuery] = useQueries({
    queries: [
      {
        queryKey: ["posts", activeTab, channelIds],
        queryFn: async () => {
          const params = new URLSearchParams()
          params.append("group_by_date", "true")
          if (activeTab) params.append("status", activeTab)
          if (channelIds.length > 0) params.append("channelIds", channelIds.join(","))
          const res = await fetch(`/api/post?${params.toString()}`)
          if (!res.ok) throw new Error("Failed to fetch posts")
          return res.json()
        },
      },
      {
        queryKey: ["posts", "totals", channelIds],
        queryFn: async () => {
          const params = new URLSearchParams()
          if (channelIds.length > 0) params.append("channelIds", channelIds.join(","))
          const res = await fetch(`/api/post/totals?${params.toString()}`)
          if (!res.ok) throw new Error("Failed to fetch totals")
          return res.json()
        },
      },
    ],
  })

  const data = postsQuery.data
  const isPending = postsQuery.isFetching
  const totalPosts = totalsQuery.data
  const isTotalsFetching = totalsQuery.isFetching



  const publishPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/post/${postId}/publish`, {
        method: "POST"
      })
      if (!res.ok) throw new Error("Failed to publish post");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Publication en cours de traitement...")
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "posts",
      });
    }
  })

  const groupPosts = (data?.groupPosts || []) as GroupPostType[]

  const totalDrafts = totalPosts?.totalDrafts || 0
  const totalQueue = totalPosts?.totalQueue || 0
  const totalPublished = totalPosts?.totalPublished || 0
  const totalFailed = totalPosts?.totalFailed || 0

  const renderTotalBadge = (total: number) => (
    <Badge variant="secondary" className="min-w-6">
      {isTotalsFetching ? <Spinner className="size-3" /> : total}
    </Badge>
  )

  const getTrackingMeta = (post: PostType) => {
    if (post.status === "failed") {
      return {
        label: "Échec",
        tone: "destructive" as const,
        icon: AlertTriangle,
        detail: "La publication n’a pas été validée par le réseau.",
      }
    }

    const visibility = post.visibility_status ?? "unknown"
    const publishState = post.publish_status ?? "pending"

    if (publishState === "partial") {
      return {
        label: "Partiel",
        tone: "warning" as const,
        icon: AlertTriangle,
        detail: "Certains canaux ont été publiés et d’autres non.",
      }
    }

    if (post.status === "published") {
      if (visibility === "visible") {
        return {
          label: "Visible",
          tone: "success" as const,
          icon: Eye,
          detail: "Publication acceptée et visible sur le réseau.",
        }
      }
      if (visibility === "hidden") {
        return {
          label: "Non visible",
          tone: "secondary" as const,
          icon: EyeOff,
          detail: "Le réseau a accepté la publication, mais elle n’est pas encore visible dans le fil.",
        }
      }
      return {
        label: "À vérifier",
        tone: "secondary" as const,
        icon: Eye,
        detail: "La publication est enregistrée, mais la visibilité n’a pas encore été confirmée.",
      }
    }

    return {
      label: "En attente",
      tone: "secondary" as const,
      icon: AlarmClockCheck,
      detail: "La publication est en cours de traitement.",
    }
  }

  const toggleChannel = (channelId: string) => {
    setChannelIds((prev) => {
      if (!prev) {
        return [channelId]
      }
      if (prev.includes(channelId)) {
        const filtered = prev.filter((id) => id !== channelId)
        return filtered.length === 0 ? null : filtered
      }
      return [...prev, channelId]
    })
  }

  const handleEditPost = (post: PostType) => {
    setSelectedPostForEdit(post)
    setIsEditDialogOpen(true)
  }

  const handlePublishNow = (post: PostType) => {
    if (publishPostMutation.isPending) return;
    publishPostMutation.mutate(
      post.id
    )
  }


  return (
    <>
      <div className="flex flex-col h-full">
        {/* Tab bar + toolbar */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 shrink-0">
          <Tabs value={activeTab || "draft"} onValueChange={(val) => setActiveTab(val)}>
            <TabsList variant="line" className="gap-4">
              <TabsTrigger value="draft" className="data-[state=active]:text-primary data-[state=active]:border-primary">
                Brouillon {renderTotalBadge(totalDrafts)}
              </TabsTrigger>
              <TabsTrigger value="queue" className="data-[state=active]:text-primary data-[state=active]:border-primary">
                File d&apos;attente {renderTotalBadge(totalQueue)}
              </TabsTrigger>
              <TabsTrigger value="published" className="data-[state=active]:text-primary data-[state=active]:border-primary">
                Publiées {renderTotalBadge(totalPublished)}
              </TabsTrigger>
              <TabsTrigger value="failed" className="data-[state=active]:text-primary data-[state=active]:border-primary">
                Échouées {renderTotalBadge(totalFailed)}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <ScheduleToolbar
            viewType="list"
            channelIds={channelIds}
            toggleChannel={toggleChannel}
            selectedStatus={activeTab}
            setSelectedStatus={setActiveTab}
          />
        </div>

        <div className="flex-1 overflow-auto px-4 pb-6">
          <div className="max-w-[860px] mx-auto w-full pt-4 space-y-2">
            {isPending ? (
              <div className="space-y-6 pt-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="h-5 w-40 rounded-full bg-white/[0.06] animate-pulse" />
                    <div className="h-[160px] w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : groupPosts.length === 0 ? (
              <div className="flex h-[60vh] flex-col items-center justify-center text-center gap-5">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <LayoutList className="size-7 text-foreground/30" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground/80">
                    {activeTab === "queue"
                      ? "Aucune publication planifiée pour le moment"
                      : activeTab === "published"
                        ? "Aucune publication pour le moment"
                        : activeTab === "failed"
                          ? "Aucune publication échouée pour le moment"
                          : "Aucun brouillon pour le moment"}
                  </h3>
                  <p className="text-sm text-foreground/40 mt-1">
                    Connectez un canal et créez votre première publication pour commencer à planifier.
                  </p>
                </div>
                <Button
                  className="rounded-full h-9 px-5 text-sm gap-1.5 font-semibold"
                  onClick={() => setCreatePostModalOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Créer une publication
                </Button>
              </div>
            ) : (
              <div className="w-full space-y-8">
                {groupPosts.map((group) => (
                  <div key={group.key}>
                    {/* Date group header */}
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/35 whitespace-nowrap">{group.label}</h2>
                      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
                    </div>

                    <div className="space-y-3">
                      {group.posts.map((post) => {
                        const scheduleDate = parseISO(post.scheduled_at);
                        const channel = post.user_channels?.channel_types;
                        const previewImage = post.images?.[0]?.url;
                        const tracking = getTrackingMeta(post)
                        const TrackingIcon = tracking.icon
                        const isOverdue = isPast(scheduleDate) && (post.status === "queue" || post.status === "draft")
                        return (
                          <div key={post.id} className="grid gap-3 lg:grid-cols-[90px_minmax(0,1fr)]">
                            {/* Time column */}
                            <div className="flex flex-col gap-1 pt-4">
                              <span className="text-sm font-semibold text-foreground/70 tabular-nums">
                                {format(scheduleDate, "h:mm a")}
                              </span>
                              <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide",
                                isOverdue ? "text-destructive" : "text-foreground/35"
                              )}>
                                <Pin className="size-3" />
                                <span>
                                  {isOverdue
                                    ? "En retard"
                                    : post.status === "draft"
                                      ? "Brouillon"
                                      : "Planifié"}
                                </span>
                              </div>
                            </div>

                            {/* Card */}
                            <div className={cn(
                              "rounded-2xl border overflow-hidden transition-all duration-200 hover:border-white/[0.12] hover:-translate-y-0.5",
                              isOverdue
                                ? "border-destructive/25 bg-destructive/[0.04]"
                                : "border-white/[0.08] dark:bg-[#0d1526]/60 bg-card"
                            )}>
                              {/* Top accent line */}
                              <div className={cn(
                                "h-px w-full",
                                isOverdue
                                  ? "bg-destructive/40"
                                  : "bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                              )} />

                              <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                                <div className="space-y-4">
                                  {/* Channel + status */}
                                  <div className="flex items-center justify-between gap-2">
                                    {channel ? (
                                      <ChannelAvatar
                                        type={channel.type}
                                        color={channel.color}
                                        profileImage={post.user_channels?.profile_image}
                                        name={post.user_channels?.handle || channel.name}
                                      />
                                    ) : null}
                                    <Badge
                                      variant={tracking.tone === "destructive" ? "destructive" : tracking.tone === "success" ? "default" : "secondary"}
                                      className="flex items-center gap-1 text-[10px] rounded-full px-2.5"
                                    >
                                      <TrackingIcon className="size-3" />
                                      {tracking.label}
                                    </Badge>
                                  </div>

                                  {/* Content */}
                                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/75 line-clamp-3">
                                    {stripRichTextFormatting(post.content) || "Aucun contenu"}
                                  </p>
                                  <p className="text-xs text-foreground/35">{tracking.detail}</p>
                                </div>

                                {/* Preview image */}
                                {previewImage && (
                                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-white/[0.08]">
                                    <img
                                      src={previewImage}
                                      alt="Média de la publication"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Footer */}
                              <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 md:flex-row md:items-center md:justify-between">
                                <p className="text-xs text-foreground/35">
                                  {post.status === "published" ? (
                                    <>
                                      Publié via <span className="font-semibold text-foreground/60">{channel?.name || "Canal"}</span>
                                    </>
                                  ) : (
                                    <>
                                      Créé il y a <span className="font-semibold text-foreground/60">
                                        {formatDistanceToNow(parseISO(post.created_at), { locale: fr })}
                                      </span>
                                    </>
                                  )}
                                </p>

                                <div className="flex items-center gap-2">
                                  {post.published_url && post.status === "published" ? (
                                    <Button asChild variant="outline" className="rounded-full h-7 px-3 text-xs">
                                      <a href={post.published_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                        Voir la publication
                                      </a>
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        className="rounded-full h-7 px-3 text-xs"
                                        onClick={() => handleEditPost(post)}
                                      >
                                        <AlarmClockCheck className="size-3" />
                                        Replanifier
                                      </Button>
                                      {(post.status === "draft" || post.status === "queue" || post.status === "failed") && (
                                        <Button
                                          className="rounded-full h-7 px-3 text-xs font-semibold"
                                          disabled={publishPostMutation.isPending}
                                          onClick={() => handlePublishNow(post)}
                                        >
                                          {publishPostMutation.isPending ? <Spinner /> : <Send className="size-3" />}
                                          {post.status === "failed" ? "Réessayer" : "Publier"}
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EditPostDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        post={selectedPostForEdit ? {
          id: selectedPostForEdit.id,
          content: selectedPostForEdit.content,
          images: selectedPostForEdit.images || [],
          scheduledDate: selectedPostForEdit.scheduled_at,
          userChannelId: selectedPostForEdit.user_channel_id || "",
          channel: selectedPostForEdit.user_channels?.channel_types ? {
            ...selectedPostForEdit.user_channels.channel_types,
            profile_image: selectedPostForEdit.user_channels.profile_image,
            handle: selectedPostForEdit.user_channels.handle
          } : null,
        } : null}
      />

    </>
  )
}

export default ListView
