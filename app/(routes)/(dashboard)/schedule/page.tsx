"use client"

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs"
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Link from "next/link";
import { addMonths, addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  History,
  LayoutList,
  Plus,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ListView from "@/components/schedule/list-view";
import CalendarView from "@/components/schedule/calendar-view";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { stripRichTextFormatting } from "@/lib/rich-text";
import { PostType } from "@/types/post.type";
import { cn } from "@/lib/utils";

type PlanningView = "month" | "week" | "list"

const viewOptions: { key: PlanningView; label: string; icon: typeof CalendarDays }[] = [
  { key: "month", label: "Mois", icon: CalendarDays },
  { key: "week", label: "Semaine", icon: CalendarRange },
  { key: "list", label: "Liste", icon: LayoutList },
]

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  queue: "File d'attente",
  published: "Publié",
  failed: "Échec",
}

const SchedulePageContent = () => {
  const [view, setView] = useQueryState("view", { defaultValue: "month" });
  const [_, setStatus] = useQueryState("status", { defaultValue: "" })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)

  const activeView = (view ?? "month") as PlanningView
  const isCalendar = activeView !== "list"

  // Lightweight summary fetch — powers the header pill, the insight strip and the footer
  const { data: allPostsData } = useQuery({
    queryKey: ["posts", "planning-summary"],
    queryFn: async () => {
      const res = await fetch("/api/post")
      if (!res.ok) throw new Error("Failed to fetch posts")
      return res.json()
    },
  })

  const allPosts = useMemo<PostType[]>(() => allPostsData?.posts ?? [], [allPostsData])

  const counts = useMemo(() => {
    return allPosts.reduce(
      (acc, post) => {
        if (post.status in acc.index) acc.index[post.status as keyof typeof acc.index] += 1
        return acc
      },
      { index: { draft: 0, queue: 0, published: 0, failed: 0 } }
    ).index
  }, [allPosts])

  const nextPost = useMemo(() => {
    const now = Date.now()
    return allPosts
      .filter((post) => new Date(post.scheduled_at).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
  }, [allPosts])

  const periodLabel = useMemo(() => {
    if (activeView === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`
    }
    return format(currentDate, "MMMM yyyy", { locale: fr })
  }, [activeView, currentDate])

  const stepPeriod = (direction: -1 | 1) => {
    setCurrentDate((prev) =>
      activeView === "week" ? addWeeks(prev, direction) : addMonths(prev, direction)
    )
  }

  const handleExport = async () => {
    try {
      const res = await fetch("/api/post")
      if (!res.ok) throw new Error("Failed to fetch posts")
      const json = await res.json()
      const posts: PostType[] = json.posts ?? []

      if (posts.length === 0) {
        toast.info("Aucune publication à exporter pour le moment.")
        return
      }

      const rows = [
        ["Date", "Heure", "Statut", "Canal", "Contenu"],
        ...posts.map((post) => {
          const date = new Date(post.scheduled_at)
          return [
            format(date, "yyyy-MM-dd"),
            format(date, "HH:mm"),
            statusLabels[post.status] ?? post.status,
            post.user_channels?.channel_types?.name ?? "",
            stripRichTextFormatting(post.content ?? ""),
          ]
        }),
      ]

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\r\n")

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `planning-lemon-${format(new Date(), "yyyy-MM-dd")}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${posts.length} publication(s) exportée(s).`)
    } catch {
      toast.error("L'export a échoué. Réessayez.")
    }
  }

  const showDrafts = () => {
    setStatus("draft")
    setView("list")
  }

  return (
    <div className="flex flex-col gap-4 px-1">
      {/* ── En-tête — Studio Editorial ── */}
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
              <Calendar className="size-[18px] text-moss" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">Planning éditorial</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white dark:bg-mist/10 px-2.5 py-1">
                  <span className="size-2 rounded-full bg-lemon animate-pulse-soft" />
                  <span className="tag-code text-mute">{periodLabel}</span>
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-mute">
                Organisez, filtrez et validez vos publications sur tous vos canaux.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation de période */}
          {isCalendar && (
            <div className="flex items-center gap-0.5 rounded-full border border-hairline bg-white dark:bg-card p-0.5">
              <button
                onClick={() => stepPeriod(-1)}
                aria-label="Période précédente"
                className="flex size-7 items-center justify-center rounded-full text-mute transition-colors hover:bg-mist hover:text-ink"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => stepPeriod(1)}
                aria-label="Période suivante"
                className="flex size-7 items-center justify-center rounded-full text-mute transition-colors hover:bg-mist hover:text-ink"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-0.5 rounded-full bg-mist px-2.5 py-1 tag-code text-ink transition-colors hover:bg-lemon/20"
              >
                Aujourd&apos;hui
              </button>
            </div>
          )}

          {/* Sélecteur de vue */}
          <div className="flex items-center gap-0.5 rounded-full border border-hairline bg-white dark:bg-card p-0.5">
            {viewOptions.map((option) => {
              const Icon = option.icon
              const isActive = activeView === option.key
              return (
                <button
                  key={option.key}
                  onClick={() => {
                    setStatus(null)
                    setView(option.key)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
                    isActive
                      ? "bg-ink text-lemon shadow-sm"
                      : "text-mute hover:bg-mist hover:text-ink"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="max-sm:hidden">{option.label}</span>
                </button>
              )
            })}
          </div>

          <Button
            asChild
            variant="outline"
            className="h-8 gap-1.5 rounded-full border-hairline bg-white dark:bg-card px-3.5 text-[12px] font-semibold text-mute hover:text-ink hover:border-lemon/30 transition-all duration-200"
          >
            <Link href="/schedule/history">
              <History className="size-3.5" />
              Historique
            </Link>
          </Button>

          <Button
            onClick={() => setCreatePostModalOpen(true)}
            className="h-8 gap-1.5 rounded-full bg-lemon px-4 text-[12px] font-bold text-ink shadow-[0_6px_20px_-4px_rgba(198,255,26,0.4)] hover:bg-lemon/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus className="size-3.5" />
            Planifier un post
          </Button>
        </div>
      </header>

      {/* ── Bandeau d'information — botanical accent ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lemon/25 bg-lemon/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-card text-moss shadow-sm border border-hairline">
            <Clock className="size-4" />
          </span>
          <p className="text-[13px] text-ink/80">
            {nextPost ? (
              <>
                Prochaine publication{" "}
                <span className="font-bold text-ink">
                  {format(new Date(nextPost.scheduled_at), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                </span>
                {nextPost.user_channels?.channel_types?.name
                  ? ` — ${nextPost.user_channels.channel_types.name}`
                  : ""}
              </>
            ) : (
              <>Aucune publication programmée. Créez-en une pour démarrer.</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {counts.draft > 0 && (
            <button
              onClick={showDrafts}
              className="rounded-full border border-hairline bg-white dark:bg-card px-3 py-1 tag-code text-moss transition-all hover:bg-lemon/15 hover:border-lemon/30"
            >
              {counts.draft} brouillon{counts.draft > 1 ? "s" : ""} à valider
            </button>
          )}
          <span className="tag-code text-mute tabular-nums">
            {counts.queue} en file
          </span>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div
        className={
          activeView === "list"
            ? "overflow-hidden"
            : "h-[calc(100svh-340px)] min-h-[520px] overflow-hidden"
        }
      >
        {activeView === "list" ? (
          <ListView setCreatePostModalOpen={setCreatePostModalOpen} />
        ) : (
          <CalendarView
            view={activeView}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        )}
      </div>

      {/* ── Synthèse — editorial footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-white dark:bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <StatDot color="bg-lemon" label="En file" value={counts.queue} />
          <StatDot color="bg-mute" label="Brouillons" value={counts.draft} />
          <StatDot color="bg-[#27C93F]" label="Publiés" value={counts.published} />
          <StatDot color="bg-stamp" label="Échecs" value={counts.failed} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            className="h-8 gap-1.5 rounded-full border-hairline bg-white dark:bg-card px-3.5 text-[12px] font-semibold text-mute hover:text-ink transition-all"
          >
            <Download className="size-3.5" />
            Exporter le planning
          </Button>
          <Button
            asChild
            className="h-8 gap-1.5 rounded-full bg-ink px-4 text-[12px] font-bold text-lemon hover:bg-ink/90 transition-all"
          >
            <Link href="/schedule/history">Voir l&apos;historique</Link>
          </Button>
        </div>
      </div>

      <CreatePostDialog
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
      />
    </div>
  )
}

const StatDot = ({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) => (
  <div className="flex items-center gap-1.5">
    <span className={cn("size-2 rounded-full", color)} />
    <span className="text-[12px] text-mute">{label}</span>
    <span className="text-[12px] font-bold text-ink tabular-nums">{value}</span>
  </div>
)

const SchedulePage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-lemon/30 border-t-lemon animate-spin" />
          <p className="text-sm text-mute">Chargement...</p>
        </div>
      </div>
    }>
      <NuqsAdapter>
        <SchedulePageContent />
      </NuqsAdapter>
    </Suspense>
  )
}

export default SchedulePage
