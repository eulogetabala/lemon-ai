import { PostType } from "@/types/post.type";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { Badge } from "../ui/badge";
import ScheduleToolbar from "./schedule-toolbar";
import { Skeleton } from "../ui/skeleton";
import { AlarmClockCheck, ExternalLink, LayoutList, Pin, Plus, Send, Eye, EyeOff, AlertTriangle, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
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

const tabConfig: { value: TabType; label: string }[] = [
  { value: "draft", label: "Brouillons" },
  { value: "queue", label: "Planifiés" },
  { value: "published", label: "Publiés" },
  { value: "failed", label: "Échoués" },
]

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

  const totalsMap: Record<string, number> = {
    draft: totalDrafts,
    queue: totalQueue,
    published: totalPublished,
    failed: totalFailed,
  }

  const getTrackingMeta = (post: PostType) => {
    if (post.status === "failed") {
      return {
        label: "Échec",
        tone: "destructive" as const,
        icon: AlertTriangle,
        detail: "La publication n'a pas été validée par le réseau.",
        dotColor: "bg-stamp",
      }
    }

    const visibility = post.visibility_status ?? "unknown"
    const publishState = post.publish_status ?? "pending"

    if (publishState === "partial") {
      return {
        label: "Partiel",
        tone: "warning" as const,
        icon: AlertTriangle,
        detail: "Certains canaux ont été publiés et d'autres non.",
        dotColor: "bg-yellow-400",
      }
    }

    if (post.status === "published") {
      if (visibility === "visible") {
        return {
          label: "Visible",
          tone: "success" as const,
          icon: Eye,
          detail: "Publication acceptée et visible sur le réseau.",
          dotColor: "bg-[#27C93F]",
        }
      }
      if (visibility === "hidden") {
        return {
          label: "Non visible",
          tone: "secondary" as const,
          icon: EyeOff,
          detail: "Le réseau a accepté la publication, mais elle n'est pas encore visible dans le fil.",
          dotColor: "bg-mute",
        }
      }
      return {
        label: "À vérifier",
        tone: "secondary" as const,
        icon: Eye,
        detail: "La publication est enregistrée, mais la visibilité n'a pas encore été confirmée.",
        dotColor: "bg-mute",
      }
    }

    return {
      label: "En attente",
      tone: "secondary" as const,
      icon: AlarmClockCheck,
      detail: "La publication est en cours de traitement.",
      dotColor: "bg-lemon",
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
    publishPostMutation.mutate(post.id)
  }

  return (
    <>
      <div className="flex flex-col h-full rounded-2xl border border-hairline bg-white dark:bg-card overflow-hidden">
        {/* ── Studio Editorial Tab Bar ── */}
        <div className="flex items-center justify-between border-b border-hairline px-4 shrink-0">
          {/* Pill-style tabs — matching landing nav */}
          <nav className="flex items-center gap-0.5 py-2">
            {tabConfig.map((tab) => {
              const isActive = activeTab === tab.value
              const total = totalsMap[tab.value]
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
                    isActive
                      ? "bg-ink text-lemon"
                      : "text-mute hover:bg-mist hover:text-ink"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 tabular-nums",
                    isActive
                      ? "bg-lemon/20 text-lemon"
                      : "bg-mist text-mute"
                  )}>
                    {isTotalsFetching ? <Spinner className="size-2.5" /> : total}
                  </span>
                </button>
              )
            })}
          </nav>

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
                    <div className="h-5 w-40 rounded-full bg-mist animate-pulse" />
                    <div className="h-[160px] w-full rounded-2xl bg-mist/50 border border-hairline animate-pulse" />
                  </div>
                ))}
              </div>
            ) : groupPosts.length === 0 ? (
              <div className="flex h-[55vh] flex-col items-center justify-center text-center gap-5">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-hairline bg-mist/30">
                  <LayoutList className="size-7 text-mute" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {activeTab === "queue"
                      ? "Aucune publication planifiée"
                      : activeTab === "published"
                        ? "Aucune publication pour le moment"
                        : activeTab === "failed"
                          ? "Aucune publication échouée"
                          : "Aucun brouillon pour le moment"}
                  </h3>
                  <p className="text-sm text-mute mt-1.5 leading-relaxed max-w-xs">
                    Connectez un canal et créez votre première publication pour commencer à planifier.
                  </p>
                </div>
                <Button
                  className="rounded-full h-9 px-5 text-sm gap-1.5 font-bold bg-lemon text-ink hover:bg-lemon/90 shadow-[0_6px_20px_-4px_rgba(198,255,26,0.4)] hover:-translate-y-0.5 transition-all duration-200"
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
                    {/* Date group header — editorial ruler */}
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="tag-code text-mute whitespace-nowrap">{group.label}</h2>
                      <div className="flex-1 h-px bg-hairline" />
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
                          <div key={post.id} className="grid gap-3 lg:grid-cols-[80px_minmax(0,1fr)]">
                            {/* Time column */}
                            <div className="flex flex-col gap-1 pt-4">
                              <span className="text-sm font-bold text-ink tabular-nums">
                                {format(scheduleDate, "HH:mm")}
                              </span>
                              <div className={cn(
                                "flex items-center gap-1 tag-code",
                                isOverdue ? "text-stamp" : "text-mute"
                              )}>
                                <Pin className="size-2.5" />
                                <span>
                                  {isOverdue
                                    ? "Retard"
                                    : post.status === "draft"
                                      ? "Brouillon"
                                      : "Planifié"}
                                </span>
                              </div>
                            </div>

                            {/* Post Card — editorial */}
                            <div className={cn(
                              "rounded-2xl border overflow-hidden transition-all duration-200 card-lift",
                              isOverdue
                                ? "border-stamp/25 bg-stamp/[0.03]"
                                : "border-hairline bg-white dark:bg-card"
                            )}>
                              {/* Top accent line — lemon gradient */}
                              <div className={cn(
                                "h-[2px] w-full",
                                isOverdue
                                  ? "bg-stamp/50"
                                  : "post-card-accent"
                              )} />

                              <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_200px]">
                                <div className="space-y-3">
                                  {/* Channel + status row */}
                                  <div className="flex items-center justify-between gap-2">
                                    {channel ? (
                                      <ChannelAvatar
                                        type={channel.type}
                                        color={channel.color}
                                        profileImage={post.user_channels?.profile_image}
                                        name={post.user_channels?.handle || channel.name}
                                      />
                                    ) : null}

                                    {/* Status badge — editorial pill */}
                                    <div className={cn(
                                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                                      tracking.tone === "destructive"
                                        ? "border-stamp/30 bg-stamp/8 text-stamp"
                                        : tracking.tone === "success"
                                          ? "border-[#27C93F]/30 bg-[#27C93F]/8 text-moss dark:text-[#27C93F]"
                                          : "border-hairline bg-mist/50 text-mute"
                                    )}>
                                      <span className={cn("size-1.5 rounded-full", tracking.dotColor)} />
                                      <span className="tag-code">{tracking.label}</span>
                                    </div>
                                  </div>

                                  {/* Content preview */}
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/75 line-clamp-3">
                                    {stripRichTextFormatting(post.content) || "Aucun contenu"}
                                  </p>
                                  <p className="text-xs text-mute">{tracking.detail}</p>
                                </div>

                                {/* Preview image */}
                                {previewImage && (
                                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-hairline">
                                    <img
                                      src={previewImage}
                                      alt="Média de la publication"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Footer — editorial style */}
                              <div className="flex flex-col gap-3 border-t border-hairline bg-mist/20 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
                                <p className="flex items-center gap-1.5 text-xs text-mute">
                                  <Clock className="size-3" />
                                  {post.status === "published" ? (
                                    <>
                                      Publié via <span className="font-semibold text-ink/60">{channel?.name || "Canal"}</span>
                                    </>
                                  ) : (
                                    <>
                                      Créé il y a <span className="font-semibold text-ink/60">
                                        {formatDistanceToNow(parseISO(post.created_at), { locale: fr })}
                                      </span>
                                    </>
                                  )}
                                </p>

                                <div className="flex items-center gap-2">
                                  {post.published_url && post.status === "published" ? (
                                    <Button asChild variant="outline" className="rounded-full h-7 px-3 text-xs border-hairline hover:border-lemon/30 hover:bg-lemon/8 transition-all">
                                      <a href={post.published_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                        Voir la publication
                                      </a>
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        className="rounded-full h-7 px-3 text-xs border-hairline text-mute hover:text-ink hover:border-lemon/30 transition-all"
                                        onClick={() => handleEditPost(post)}
                                      >
                                        <AlarmClockCheck className="size-3" />
                                        Replanifier
                                      </Button>
                                      {(post.status === "draft" || post.status === "queue" || post.status === "failed") && (
                                        <Button
                                          className="rounded-full h-7 px-3 text-xs font-bold bg-lemon text-ink hover:bg-lemon/90 transition-all"
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
