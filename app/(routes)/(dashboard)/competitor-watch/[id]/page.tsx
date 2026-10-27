"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  BarChart2,
  ImageOff,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

function Trend({ change }: { change: number }) {
  const isUp = change > 0
  const isDown = change < 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        isUp && "text-foreground",
        isDown && "text-destructive",
        !isUp && !isDown && "text-muted-foreground",
      )}
    >
      {isUp ? (
        <TrendingUp className="size-3 text-primary" />
      ) : isDown ? (
        <TrendingDown className="size-3" />
      ) : (
        <Minus className="size-3" />
      )}
      {isUp ? "+" : ""}
      {change} % vs mois précédent
    </span>
  )
}

function StatTile({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change: number
}) {
  return (
    <div className="group rounded-3xl border border-border/70 bg-card p-5 shadow-[0_14px_38px_rgba(33,52,24,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-primary/40" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-3">
        <Trend change={change} />
      </div>
    </div>
  )
}

function PlatformBlock({
  stats,
  prevStats,
  platform,
}: {
  stats: CompetitorStat | undefined
  prevStats: CompetitorStat | undefined
  platform: CompetitorPlatformKey
}) {
  const meta = PLATFORM_META[platform]
  if (!stats) return null

  const metrics = [
    { label: "Impressions", key: "impressions" as const, icon: Eye },
    { label: "J&apos;aime", key: "likes" as const, icon: Heart },
    { label: "Commentaires", key: "comments" as const, icon: MessageCircle },
    { label: "Partages", key: "shares" as const, icon: Share2 },
  ]

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-gradient-to-r from-muted/40 to-transparent px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="font-semibold text-sm">{meta.label}</span>
          {stats.posts > 0 && (
            <Badge variant="secondary" className="h-5 text-[10px] font-medium">
              {stats.posts} publication{stats.posts > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {stats.engagementRate.toFixed(1)} % d&apos;engagement
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border/70 sm:divide-y-0">
        {metrics.map(({ label, key, icon: Icon }) => {
          const change = prevStats ? pctChange(stats[key], prevStats[key]) : 0
          return (
            <div key={key} className="p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Icon className="size-3.5" />
                <span dangerouslySetInnerHTML={{ __html: label }} />
              </div>
              <p className="text-lg font-semibold tabular-nums">{formatNumber(stats[key])}</p>
              {prevStats && (
                <p
                  className={cn(
                    "mt-1 text-xs font-medium tabular-nums",
                    change > 0 && "text-foreground",
                    change < 0 && "text-destructive",
                    change === 0 && "text-muted-foreground",
                  )}
                >
                  {change > 0 ? "+" : ""}
                  {change} %
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PostRow({ post }: { post: CompetitorPost }) {
  const meta = PLATFORM_META[post.platform]
  return (
      <div className="flex gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/60">
        {post.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageOff className="size-4 text-muted-foreground/40" />
          </div>
        )}
        <span
          className="absolute inset-x-2 bottom-2 rounded-full border border-white/30 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm"
          style={{ backgroundColor: `${meta.color}CC` }}
        >
          {meta.label}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {meta.label}
          </span>
          <span className="text-border">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo(post.publishedAt)}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85">
          {stripRichTextFormatting(post.content) || "Aucun contenu"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <Heart className="size-3" />
            {formatNumber(post.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            {formatNumber(post.comments)}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="size-3" />
            {formatNumber(post.shares)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {formatNumber(post.views)}
          </span>
          <span className="ml-auto rounded-full border border-border bg-muted/40 px-2 py-1 font-medium text-foreground">
            {post.engagementRate.toFixed(1)} %
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<CompetitorDetail | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const monthQuery = selectedMonth ? `?month=${selectedMonth}` : ""
    fetch(`/api/competitor/${id}${monthQuery}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CompetitorDetail | null) => {
        if (cancelled) return
        setDetail(data)
        if (data && !selectedMonth) setSelectedMonth(data.month)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
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

  const { competitor, availableMonths, stats, prevStats, posts } = detail
  const month = selectedMonth ?? detail.month
  const monthIndex = availableMonths.indexOf(month)

  const totalImpressions = stats.reduce((a, s) => a + s.impressions, 0)
  const totalLikes = stats.reduce((a, s) => a + s.likes, 0)
  const totalPosts = stats.reduce((a, s) => a + s.posts, 0)
  const avgEngagement = stats.length ? stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length : 0

  const prevTotalImpressions = prevStats.reduce((a, s) => a + s.impressions, 0)
  const prevTotalLikes = prevStats.reduce((a, s) => a + s.likes, 0)
  const prevTotalPosts = prevStats.reduce((a, s) => a + s.posts, 0)
  const prevAvgEngagement = prevStats.length ? prevStats.reduce((a, s) => a + s.engagementRate, 0) / prevStats.length : 0

  const totalFollowers = competitor.platforms.reduce((sum, p) => sum + p.followers, 0)

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-10">
        <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/competitor-watch">
            <ArrowLeft className="size-4" />
            Retour aux concurrents
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[0_24px_70px_rgba(33,52,24,0.08)]">
        <div className="relative isolate overflow-hidden border-b border-white/10 bg-[#11190f] px-6 py-6 text-white sm:px-8">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(196,242,100,0.16),transparent_50%)]" />
          <div aria-hidden="true" className="absolute -right-12 -top-28 size-80 rounded-full border border-primary/15" />
          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-lg font-bold text-primary-foreground shadow-sm">
                {competitor.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-white">{competitor.name}</h1>
                  {competitor.verified && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Connecté
                    </span>
                  )}
                  <Badge variant="secondary" className="rounded-full border border-white/15 bg-white/[0.08] text-xs font-semibold text-white/80">
                    {competitor.industry || "—"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                  {competitor.platforms.map((p) => {
                    const profileUrl = p.profileUrl || buildProfileUrl(p.platform, p.handle)
                    return (
                      <a
                        key={p.platform}
                        href={profileUrl ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tabular-nums underline-offset-2 hover:underline"
                      >
                        {PLATFORM_META[p.platform].label} · {p.handle} · {formatNumber(p.followers)} abonnés
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                {isSyncing ? "Synchronisation…" : "Synchroniser"}
              </Button>
              {competitor.website && (
                <Button variant="outline" size="sm" asChild className="shrink-0 rounded-xl border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]">
                  <a href={competitor.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Site web
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

          <div className="space-y-8 px-4 py-5 sm:px-8 sm:py-7">
          <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-border/70 bg-muted/45 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Vue d’ensemble</p>
                  <h2 className="mt-1 text-lg font-semibold">Performance du mois</h2>
                </div>
                <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {formatMonth(month)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Audience</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">{formatNumber(totalFollowers)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Impressions</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">{formatNumber(totalImpressions)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Engagement</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">{avgEngagement.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Période</p>
                <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={monthIndex >= availableMonths.length - 1}
                    onClick={() => setSelectedMonth(availableMonths[monthIndex + 1])}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[110px] px-2 text-center text-sm font-medium capitalize">
                    {formatMonth(month)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={monthIndex <= 0}
                    onClick={() => setSelectedMonth(availableMonths[monthIndex - 1])}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Publications</span>
                  <span className="font-semibold tabular-nums">{totalPosts}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">J’aime</span>
                  <span className="font-semibold tabular-nums">{formatNumber(totalLikes)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Impressions</span>
                  <span className="font-semibold tabular-nums">{formatNumber(totalImpressions)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold">Statistiques — {formatMonth(month)}</h2>
          </div>

          {stats.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  label="Impressions"
                  value={formatNumber(totalImpressions)}
                  change={pctChange(totalImpressions, prevTotalImpressions)}
                />
                <StatTile
                  label="J'aime"
                  value={formatNumber(totalLikes)}
                  change={pctChange(totalLikes, prevTotalLikes)}
                />
                <StatTile
                  label="Publications"
                  value={totalPosts.toString()}
                  change={pctChange(totalPosts, prevTotalPosts)}
                />
                <StatTile
                  label="Engagement moyen"
                  value={`${avgEngagement.toFixed(1)} %`}
                  change={pctChange(Math.round(avgEngagement * 10), Math.round(prevAvgEngagement * 10))}
                />
              </div>

              <div className="space-y-3">
                {competitor.platforms.map((cp) => {
                  const platformStats = stats.find((s) => s.platform === cp.platform)
                  const prev = prevStats.find((s) => s.platform === cp.platform)
                  return (
                    <PlatformBlock
                      key={cp.platform}
                      platform={cp.platform}
                      stats={platformStats}
                      prevStats={prev}
                    />
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20">
              <BarChart2 className="size-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucune donnée pour {formatMonth(month)} — lancez une synchronisation.
              </p>
            </div>
          )}

          <Separator className="my-2" />

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">
              Publications
              <span className="ml-2 text-sm font-normal text-muted-foreground">({posts.length})</span>
            </h3>
          </div>

          {posts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 px-5 shadow-sm">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20">
              <p className="text-sm text-muted-foreground">Aucune publication pour ce mois</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
