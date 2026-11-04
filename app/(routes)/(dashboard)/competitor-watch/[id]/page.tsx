"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
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
  Minus,
  RefreshCw,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { stripRichTextFormatting } from "@/lib/rich-text"
import { buildProfileUrl } from "@/lib/competitor-sync"
import { PLATFORM_META, formatNumber, formatMonth, pctChange, timeAgo } from "../_data"
import type {
  CompetitorDetail,
  CompetitorPost,
  CompetitorPlatformKey,
  CompetitorStat,
} from "@/types/competitor.type"

/* ─────────────── primitives ─────────────── */

function Delta({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
        <Minus className="size-3" />0 %
      </span>
    )
  }
  const up = change > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
        up ? "text-foreground" : "text-destructive",
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {change} %
    </span>
  )
}

function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[#e8ece8] bg-white/90 p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_10px_24px_-18px_rgba(23,33,29,0.18)]",
        className,
      )}
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f7a73]">
          {title}
        </h3>
        {hint && <span className="text-[10px] tabular-nums text-[#839188]">{hint}</span>}
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-[#dfe5df] bg-[#f7f9f6] px-4 text-center text-sm text-[#66736b]">
      {children}
    </div>
  )
}

/* ─────────────── graphs ─────────────── */

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((item) => (
        <div key={item.label} className="group flex h-full flex-1 flex-col justify-end gap-1">
          <div
            className="w-full rounded-sm bg-foreground/15 transition-colors group-hover:bg-foreground/35"
            style={{ height: `${item.value === 0 ? 2 : Math.max(8, (item.value / max) * 100)}%` }}
            title={`${item.label} · ${item.value}`}
          />
          <span className="text-center text-[9px] tabular-nums text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function AreaChart({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
        Pas assez de mois pour tracer une courbe
      </div>
    )
  }

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = 100 / (values.length - 1)
  const points = values.map((value, index) => ({
    x: index * step,
    y: 100 - ((value - min) / range) * 100,
  }))
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")
  const area = `${line} L100,100 L0,100 Z`

  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full overflow-visible">
        <path d={area} className="fill-foreground/[0.07]" />
        <path
          d={line}
          fill="none"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          className="stroke-foreground"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={1.6}
            vectorEffect="non-scaling-stroke"
            className="fill-background stroke-foreground"
            strokeWidth={1.25}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-muted-foreground">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function EngagementSplit({
  likes,
  comments,
  shares,
}: {
  likes: number
  comments: number
  shares: number
}) {
  const total = likes + comments + shares
  const segments = [
    { label: "J’aime", value: likes, className: "bg-foreground" },
    { label: "Commentaires", value: comments, className: "bg-foreground/50" },
    { label: "Partages", value: shares, className: "bg-foreground/25" },
  ]

  if (total === 0) return <Empty>Aucune interaction mesurée ce mois</Empty>

  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.label}
              className={cn("h-full", segment.className)}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-full", segment.className)} />
              {segment.label}
            </span>
            <span className="font-medium tabular-nums">{formatNumber(segment.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────── calendar ─────────────── */

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"]

function MiniCalendar({
  month,
  posts,
  availableMonths,
  onMonthChange,
}: {
  month: string
  posts: CompetitorPost[]
  availableMonths: string[]
  onMonthChange: (month: string) => void
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const [year, monthNumber] = month.split("-").map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7

  const byDay = new Map<number, CompetitorPost[]>()
  for (const post of posts) {
    const date = new Date(post.publishedAt)
    if (date.getFullYear() !== year || date.getMonth() !== monthNumber - 1) continue
    const day = date.getDate()
    byDay.set(day, [...(byDay.get(day) ?? []), post])
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthNumber - 1
  const monthIndex = availableMonths.indexOf(month)
  const canGoOlder = monthIndex >= 0 && monthIndex < availableMonths.length - 1
  const canGoNewer = monthIndex > 0

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const dayPosts = selectedDay ? byDay.get(selectedDay) ?? [] : []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium capitalize">{formatMonth(month)}</span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Mois précédent"
            disabled={!canGoOlder}
            onClick={() => canGoOlder && onMonthChange(availableMonths[monthIndex + 1])}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            disabled={!canGoNewer}
            onClick={() => canGoNewer && onMonthChange(availableMonths[monthIndex - 1])}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {WEEKDAYS.map((weekday, index) => (
          <span
            key={`weekday-${index}`}
            className="pb-1 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60"
          >
            {weekday}
          </span>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />

          const count = byDay.get(day)?.length ?? 0
          const active = selectedDay === day
          const isToday = isCurrentMonth && today.getDate() === day

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={count === 0}
              onClick={() => setSelectedDay(active ? null : day)}
              title={count > 0 ? `${count} publication${count > 1 ? "s" : ""}` : undefined}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-[5px] text-[10px] tabular-nums transition-colors",
                count === 0 && "text-muted-foreground/35",
                count > 0 && !active && "bg-foreground/[0.08] font-medium text-foreground hover:bg-foreground/15",
                active && "bg-foreground font-medium text-background",
                isToday && !active && "ring-1 ring-foreground/30",
              )}
            >
              {day}
              {count > 0 && !active && (
                <span className="absolute bottom-[2px] size-[3px] rounded-full bg-foreground/60" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 border-t border-border/60 pt-2.5">
        {selectedDay ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {selectedDay} {formatMonth(month)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            {dayPosts.map((post) => {
              const body = (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PLATFORM_META[post.platform].color }}
                    />
                    <span className="truncate">
                      {stripRichTextFormatting(post.content) || "Sans texte"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatNumber(post.likes)}
                  </span>
                </>
              )
              return post.postUrl ? (
                <a
                  key={post.id}
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 text-[11px] hover:text-foreground"
                >
                  {body}
                </a>
              ) : (
                <div key={post.id} className="flex items-center justify-between gap-2 text-[11px]">
                  {body}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/70">
            {posts.length > 0
              ? "Sélectionnez un jour actif."
              : "Aucune publication enregistrée ce mois."}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─────────────── data rows ─────────────── */

function PlatformRow({
  platform,
  stats,
  prev,
}: {
  platform: CompetitorPlatformKey
  stats: CompetitorStat | undefined
  prev: CompetitorStat | undefined
}) {
  const meta = PLATFORM_META[platform]

  if (!stats) {
    return (
      <div className="flex items-center justify-between py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
        <span>Aucune donnée</span>
      </div>
    )
  }

  const metrics = [
    { label: "Impressions", value: stats.impressions, previous: prev?.impressions, icon: Eye },
    { label: "J’aime", value: stats.likes, previous: prev?.likes, icon: Heart },
    { label: "Commentaires", value: stats.comments, previous: prev?.comments, icon: MessageCircle },
    { label: "Partages", value: stats.shares, previous: prev?.shares, icon: Share2 },
  ]

  return (
    <div className="border-b border-border/50 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
          {stats.posts > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground">
              {stats.posts} pub.
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {stats.engagementRate.toFixed(1)} % engagement
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {metrics.map(({ label, value, previous, icon: Icon }) => (
          <div key={label}>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <Icon className="size-3" />
              {label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular-nums">{formatNumber(value)}</span>
              {typeof previous === "number" && previous > 0 && (
                <Delta change={pctChange(value, previous)} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PostRow({ post }: { post: CompetitorPost }) {
  const meta = PLATFORM_META[post.platform]

  const body = (
    <div className="flex items-start gap-3 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/50">
        {post.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="size-3.5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
          <span className="text-border">·</span>
          <span className="normal-case tracking-normal">{timeAgo(post.publishedAt)}</span>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-foreground/80">
          {stripRichTextFormatting(post.content) || "Aucun contenu"}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" />
            {formatNumber(post.likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3" />
            {formatNumber(post.comments)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="size-3" />
            {formatNumber(post.shares)}
          </span>
          <span className="ml-auto text-foreground">{post.engagementRate.toFixed(1)} %</span>
        </div>
      </div>
    </div>
  )

  if (!post.postUrl) {
    return <div className="border-b border-border/50 last:border-b-0">{body}</div>
  }

  return (
    <a
      href={post.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/30"
    >
      {body}
    </a>
  )
}

/* ─────────────── page ─────────────── */

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<CompetitorDetail | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const monthQuery = selectedMonth ? `?month=${selectedMonth}` : ""

    const loadDetail = async () => {
      try {
        const res = await fetch(`/api/competitor/${id}${monthQuery}`)
        if (!res.ok) {
          if (!cancelled) setDetail(null)
          return
        }

        const data: CompetitorDetail | null = await res.json()
        if (cancelled) return

        setDetail(data)
        if (data && !selectedMonth) setSelectedMonth(data.month)

        if (data && !selectedMonth) {
          try {
            await fetch(`/api/competitor/${id}/sync`, { method: "POST" })
            const refreshed = await fetch(`/api/competitor/${id}`)
            if (!cancelled && refreshed.ok) {
              setDetail(await refreshed.json())
            }
          } catch {
            // ignore auto-sync failures; manual sync remains available
          }
        }
      } catch {
        if (!cancelled) setDetail(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDetail()
    return () => {
      cancelled = true
    }
  }, [id, selectedMonth])

  const handleSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await fetch(`/api/competitor/${id}/sync`, { method: "POST" })
      const res = await fetch(`/api/competitor/${id}${selectedMonth ? `?month=${selectedMonth}` : ""}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading && !detail) {
    return (
      <div className="mx-auto flex h-72 w-full max-w-6xl items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mx-auto flex h-72 w-full max-w-6xl flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Concurrent introuvable.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/competitor-watch">Retour aux concurrents</Link>
        </Button>
      </div>
    )
  }

  const { competitor, availableMonths, stats, prevStats, posts, allStats, allPosts } = detail
  const month = selectedMonth ?? detail.month

  const totalFollowers = competitor.platforms.reduce((sum, p) => sum + p.followers, 0)

  const monthImpressions = stats.reduce((a, s) => a + s.impressions, 0)
  const monthLikes = stats.reduce((a, s) => a + s.likes, 0)
  const monthComments = stats.reduce((a, s) => a + s.comments, 0)
  const monthShares = stats.reduce((a, s) => a + s.shares, 0)
  const monthPosts = stats.reduce((a, s) => a + s.posts, 0)
  const monthEngagement = stats.length
    ? stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length
    : 0

  const prevImpressions = prevStats.reduce((a, s) => a + s.impressions, 0)
  const prevLikes = prevStats.reduce((a, s) => a + s.likes, 0)
  const prevPosts = prevStats.reduce((a, s) => a + s.posts, 0)

  const monthly = (() => {
    const map = new Map<string, { posts: number; engagement: number }>()
    for (const stat of allStats) {
      const row = map.get(stat.month) ?? { posts: 0, engagement: 0 }
      row.posts += stat.posts
      row.engagement += stat.likes + stat.comments + stat.shares
      map.set(stat.month, row)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  })()

  const chartLabels = monthly.map(([key]) => key.slice(5))
  const postsSeries = monthly.map(([, value]) => ({ label: value.posts.toString(), value: value.posts }))
  const engagementSeries = monthly.map(([, value]) => value.engagement)

  const formatMetric = (value: number | undefined, fallback = "0") => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback
    return formatNumber(value)
  }

  const formatPercentMetric = (value: number | undefined, fallback = "0.0 %") => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback
    return `${value.toFixed(1)} %`
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#17211d]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-[22px] border border-[#e7ece7] bg-white px-4 py-3 shadow-[0_1px_0_rgba(23,33,29,0.02),0_12px_28px_-20px_rgba(23,33,29,0.18)] sm:px-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[#dfe6df] bg-[#f2f6f1] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#233528]">
              Studio
            </span>
            <span className="text-sm text-[#5e6d65]">{competitor.platforms.length} canaux en ligne</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full border-[#e7ece7] bg-white text-[#1e2a24] hover:bg-[#f5f7f4]">
              Alerte veille
            </Button>
            <Button size="sm" className="rounded-full bg-[#17211d] text-white hover:bg-[#0f1713]">
              + Nouveau projet
            </Button>
          </div>
        </header>

        <div className="mt-5 flex items-center justify-between gap-4 pb-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-[#5f6d67] hover:text-[#17211d]">
            <Link href="/competitor-watch">
              <ArrowLeft className="size-3.5" />
              Concurrents
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="rounded-full border-[#e7ece7] bg-white text-[#17211d] hover:bg-[#f5f7f4]">
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Synchronisation…" : "Synchroniser"}
          </Button>
        </div>

        <section className="mt-2 rounded-[26px] border border-[#e7ece7] bg-white p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_18px_34px_-24px_rgba(23,33,29,0.2)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#17211d] sm:text-[3rem]">{competitor.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64706a]">
                {competitor.industry && <span>{competitor.industry}</span>}
                {competitor.platforms.map((p) => {
                  const profileUrl = p.profileUrl || buildProfileUrl(p.platform, p.handle)
                  const meta = PLATFORM_META[p.platform]
                  return (
                    <a
                      key={p.platform}
                      href={profileUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#edf0ed] bg-[#f8faf8] px-2 py-1 hover:text-[#17211d]"
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                      <span className="tabular-nums text-[#1d2a24]">
                        {p.followers > 0 ? formatNumber(p.followers) : "0"}
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>

            {competitor.website && (
              <Button variant="outline" size="sm" asChild className="rounded-full border-[#e7ece7] bg-white text-[#17211d] hover:bg-[#f5f7f4]">
                <a href={competitor.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Site web
                </a>
              </Button>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-[#e7ece7] bg-white p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_12px_26px_-20px_rgba(23,33,29,0.18)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#697770]">Audience</p>
              <span className="rounded-full bg-[#edf7f2] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#167d55]">Live</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-[#17211d]">{totalFollowers > 0 ? formatNumber(totalFollowers) : "0"}</p>
            <p className="mt-1 text-[11px] text-[#6d7b73]">abonnés cumulés</p>
          </div>

          <div className="rounded-[22px] border border-[#e7ece7] bg-white p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_12px_26px_-20px_rgba(23,33,29,0.18)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#697770]">Publications</p>
              <span className="rounded-full bg-[#f3f5f2] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#5d665f]">Total</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-[#17211d]">{allPosts.length > 0 ? allPosts.length : 0}</p>
            <p className="mt-1 text-[11px] text-[#6d7b73]">suivies</p>
          </div>

          <div className="rounded-[22px] border border-[#e7ece7] bg-white p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_12px_26px_-20px_rgba(23,33,29,0.18)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#697770]">Impressions</p>
              <span className="rounded-full bg-[#eef5ef] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#167d55]">Mois</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-[#17211d]">{monthImpressions > 0 ? formatMetric(monthImpressions) : "0"}</p>
            <p className="mt-1 text-[11px] text-[#6d7b73] capitalize">{formatMonth(month)}</p>
          </div>

          <div className="rounded-[22px] border border-[#e7ece7] bg-white p-4 shadow-[0_1px_0_rgba(23,33,29,0.02),0_12px_26px_-20px_rgba(23,33,29,0.18)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#697770]">Engagement</p>
              <span className="rounded-full bg-[#edf2f9] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#566d7b]">Moy.</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-[#17211d]">{monthEngagement > 0 ? `${monthEngagement.toFixed(1)} %` : "0.0 %"}</p>
            <p className="mt-1 text-[11px] text-[#6d7b73]">moyenne du mois</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Panel title="Calendrier" hint={`${posts.length} pub.`}>
            <MiniCalendar
              month={month}
              posts={posts}
              availableMonths={availableMonths}
              onMonthChange={setSelectedMonth}
            />
          </Panel>

          <Panel title="Publications par mois" hint="6 derniers mois">
            {postsSeries.length > 0 && postsSeries.some((p) => p.value > 0) ? (
              <BarChart data={postsSeries} />
            ) : (
              <Empty>Pas encore de publications suivies</Empty>
            )}
          </Panel>

          <Panel title="Volume d’engagement" hint="6 derniers mois">
            {engagementSeries.length > 0 && engagementSeries.some((value) => value > 0) ? (
              <AreaChart values={engagementSeries} labels={chartLabels} />
            ) : (
              <Empty>Aucune interaction mesurée</Empty>
            )}
          </Panel>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-[22px] border border-border/70 bg-background/35 p-4 sm:p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Détail — {formatMonth(month)}
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Impressions</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">{monthImpressions > 0 ? formatMetric(monthImpressions) : "0"}</span>
                  {prevImpressions > 0 && <Delta change={pctChange(monthImpressions, prevImpressions)} />}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">J’aime</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">{monthLikes > 0 ? formatMetric(monthLikes) : "0"}</span>
                  {prevLikes > 0 && <Delta change={pctChange(monthLikes, prevLikes)} />}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Publications</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">{monthPosts > 0 ? monthPosts : 0}</span>
                  {prevPosts > 0 && <Delta change={pctChange(monthPosts, prevPosts)} />}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Engagement</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">{monthEngagement > 0 ? `${monthEngagement.toFixed(1)} %` : "0.0 %"}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-1">
              {competitor.platforms.map((platform) => (
                <PlatformRow
                  key={platform.platform}
                  platform={platform.platform}
                  stats={stats.find((s) => s.platform === platform.platform)}
                  prev={prevStats.find((s) => s.platform === platform.platform)}
                />
              ))}
            </div>
          </section>

          <Panel title="Répartition de l’engagement" hint="ce mois">
            <EngagementSplit likes={monthLikes} comments={monthComments} shares={monthShares} />
          </Panel>
        </div>

        <div className="mt-5 rounded-[22px] border border-border/70 bg-background/35 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Publications</h2>
            <span className="text-[11px] tabular-nums text-muted-foreground">{posts.length}</span>
          </div>

          {posts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Empty>Aucune publication sur ce mois</Empty>
          )}
        </div>
      </div>
    </div>
  )
}
