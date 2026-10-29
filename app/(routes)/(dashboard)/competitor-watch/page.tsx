"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2, TrendingUp, TrendingDown, Users, Search, X, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PLATFORM_META, formatNumber } from "./_data"
import type { CompetitorListItem, CompetitorPlatformKey } from "@/types/competitor.type"

type NewCompetitorPayload = {
  name: string
  industry?: string
  website?: string
  platforms: { platform: CompetitorPlatformKey; handle?: string; profileUrl?: string }[]
}

function AddCompetitorDialog({
  onAdd,
}: {
  onAdd: (payload: NewCompetitorPayload) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [platforms, setPlatforms] = useState<CompetitorPlatformKey[]>(["instagram"])
  const [industry, setIndustry] = useState("")
  const [platformHandles, setPlatformHandles] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setName("")
    setIndustry("")
    setPlatforms(["instagram"])
    setPlatformHandles({})
  }

  const togglePlatform = (platform: CompetitorPlatformKey) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform],
    )
  }

  const normalizeHandle = (raw: string, fallbackHandle?: string) => {
    const value = (raw ?? "").trim()
    if (!value && fallbackHandle) return fallbackHandle.replace(/^@/, "")
    if (!value) return ""

    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value)
        const segments = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
        if (segments.length > 0) return segments[segments.length - 1].replace(/[^a-zA-Z0-9-._]+/g, "")
      } catch {
        // ignore URL parsing failures and fall through to the raw value below
      }
    }

    const cleaned = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
    const segment = cleaned.split("/")[0]?.replace(/^@/, "")
    if (segment) return segment.replace(/[^a-zA-Z0-9-._]+/g, "")
    return (fallbackHandle ?? value).replace(/^@/, "")
  }

  const handleAdd = async () => {
    if (!name.trim() || platforms.length === 0) return
    setIsSubmitting(true)
    try {
      const entries = platforms
        .map((platform) => {
          const raw = (platformHandles[platform] ?? "").trim()
          if (!raw) return null
          return {
            platform,
            handle: normalizeHandle(raw),
            profileUrl: raw.startsWith("http") ? raw : undefined,
          }
        })
        .filter(Boolean) as NewCompetitorPayload["platforms"]

      if (entries.length === 0) return

      await onAdd({
        name: name.trim(),
        industry: industry.trim() || undefined,
        platforms: entries,
      })
      reset()
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button id="add-competitor-btn" className="rounded-full h-9 px-4 text-xs gap-1.5 font-bold bg-lemon text-ink hover:bg-lemon/90 shadow-[0_6px_20px_-4px_rgba(198,255,26,0.4)] hover:-translate-y-0.5 transition-all duration-200">
          <Plus className="size-3.5" />
          Ajouter un concurrent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl border-hairline">
        <DialogHeader>
          <DialogTitle className="font-extrabold tracking-tight">Nouveau concurrent</DialogTitle>
          <DialogDescription className="text-mute">
            Saisissez la page du concurrent à surveiller. Ses données publiques seront synchronisées mois par mois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Nom de la marque</label>
            <Input id="comp-name" placeholder="ex : Nike" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border-hairline" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Secteur (optionnel)</label>
            <Input id="comp-industry" placeholder="ex : Sport & Lifestyle" value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-xl border-hairline" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Réseaux à suivre</label>
            <div className="grid grid-cols-2 gap-2">
              {(["facebook", "instagram", "linkedin", "twitter"] as CompetitorPlatformKey[]).map((p) => {
                const selected = platforms.includes(p)

                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                      selected ? "border-lemon/40 bg-lemon/10 text-ink" : "border-hairline hover:bg-mist/60 text-mute",
                    )}
                  >
                    <span>{PLATFORM_META[p].label}</span>
                    {selected && <span className="tag-code text-moss">On</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink">Identifiants par plateforme</label>
              <span className="tag-code text-mute">
                {platforms.length} sélectionnée{platforms.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {platforms.map((platform) => (
                <div key={platform} className="rounded-xl border border-hairline bg-mist/20 p-3">
                  <label className="tag-code text-mute mb-1.5 block">
                    {PLATFORM_META[platform].label}
                  </label>
                  <Input
                    value={platformHandles[platform] ?? ""}
                    onChange={(e) => setPlatformHandles((prev) => ({ ...prev, [platform]: e.target.value }))}
                    className="rounded-xl border-hairline"
                    placeholder={
                      platform === "linkedin"
                        ? "https://linkedin.com/company/nike"
                        : platform === "facebook"
                          ? "https://facebook.com/nike"
                          : platform === "twitter"
                            ? "https://x.com/nike"
                            : "https://instagram.com/nike"
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full border-hairline">
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim() || platforms.length === 0 || isSubmitting} className="rounded-full bg-ink text-lemon font-bold hover:bg-ink/90">
              {isSubmitting ? "Synchronisation…" : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompetitorCard({
  competitor,
  onRemove,
}: {
  competitor: CompetitorListItem
  onRemove: () => void
}) {
  const { totals } = competitor

  return (
    <Link href={`/competitor-watch/${competitor.id}`} className="group block h-full">
      <article className="group relative h-full overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-lemon/30 hover:shadow-[0_16px_40px_-12px_rgba(198,255,26,0.15)]">
        {/* Top lemon accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lemon/40 to-transparent" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0 ring-2 ring-lemon/15">
              <AvatarFallback className="bg-lemon/15 text-sm font-bold text-moss">
                {competitor.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-bold text-ink">{competitor.name}</h2>
                {competitor.verified && (
                  <span className="rounded-full bg-lemon/15 border border-lemon/25 px-1.5 py-0.5 tag-code text-moss">
                    Connecté
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-mute">{competitor.industry || "—"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
            className="rounded-xl p-1.5 text-mute/50 opacity-0 transition-all hover:bg-stamp/10 hover:text-stamp group-hover:opacity-100"
            aria-label="Retirer le concurrent"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Platform badges */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {competitor.platforms.map((p) => (
            <span
              key={p.platform}
              className="rounded-full border border-hairline bg-mist/50 px-2.5 py-1 tag-code text-mute"
            >
              {PLATFORM_META[p.platform]?.label ?? p.platform}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <dl className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-hairline bg-mist/30 p-2.5">
            <dt className="tag-code text-mute">Abonnés</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-ink">{formatNumber(totals.followers)}</dd>
          </div>
          <div className="rounded-xl border border-hairline bg-mist/30 p-2.5">
            <dt className="tag-code text-mute">Posts</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-ink">{totals.posts || "—"}</dd>
          </div>
          <div className="rounded-xl border border-hairline bg-mist/30 p-2.5">
            <dt className="tag-code text-mute">Eng.</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-ink">
              {totals.engagement ? `${totals.engagement.toFixed(1)} %` : "—"}
            </dd>
          </div>
        </dl>

        {totals.impressions > 0 && (
          <div className="relative mt-3 flex items-center justify-between rounded-xl border border-hairline bg-mist/30 px-3 py-2 text-xs">
            <span className="text-mute tabular-nums">{formatNumber(totals.impressions)} impressions</span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-bold tabular-nums",
                totals.change >= 0 ? "text-moss" : "text-stamp",
              )}
            >
              {totals.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {totals.change > 0 ? "+" : ""}{totals.change} %
            </span>
          </div>
        )}
      </article>
    </Link>
  )
}

export default function CompetitorWatchPage() {
  const [competitors, setCompetitors] = useState<CompetitorListItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/competitor")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCompetitors(data?.competitors ?? []))
      .catch(() => setCompetitors([]))
      .finally(() => setIsLoading(false))
  }, [])

  const handleAdd = async (payload: NewCompetitorPayload) => {
    const res = await fetch("/api/competitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to create competitor")

    const list = await fetch("/api/competitor").then((r) => r.json())
    setCompetitors(list?.competitors ?? [])
  }

  const handleRemove = async (id: string) => {
    await fetch(`/api/competitor/${id}`, { method: "DELETE" })
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  const filtered = competitors.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.platforms.some(
        (p) =>
          p.handle.toLowerCase().includes(search.toLowerCase()) ||
          (p.profileUrl ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
  )

  const totalFollowers = competitors.reduce((sum, c) => sum + c.totals.followers, 0)

  return (
    <div className="w-full min-h-full py-1">
      {/* ── Header — Studio Editorial ── */}
      <header className="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
            <Radar className="size-[18px] text-moss" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Veille concurrentielle</h1>
            <p className="mt-0.5 text-[13px] text-mute">
              {isLoading
                ? "Chargement…"
                : `${competitors.length} concurrent${competitors.length > 1 ? "s" : ""} suivi${competitors.length > 1 ? "s" : ""}${totalFollowers > 0 ? ` · ${formatNumber(totalFollowers)} abonnés cumulés` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {competitors.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-mute/60" />
              <Input
                id="competitor-search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-9 text-xs rounded-full bg-white dark:bg-card border-hairline focus:border-lemon/40 transition-colors"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="size-3.5 text-mute hover:text-ink transition-colors" />
                </button>
              )}
            </div>
          )}
          <AddCompetitorDialog onAdd={handleAdd} />
        </div>
      </header>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] rounded-2xl border border-hairline bg-mist/20 animate-pulse" />
            ))}
          </div>
        ) : competitors.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-hairline bg-mist/10 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-hairline bg-white dark:bg-card">
              <Users className="size-6 text-mute" />
            </div>
            <div>
              <p className="font-bold text-ink">Aucun concurrent ajouté</p>
              <p className="text-sm text-mute mt-1">Commencez par ajouter une marque à surveiller.</p>
            </div>
            <AddCompetitorDialog onAdd={handleAdd} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm text-mute">Aucun concurrent trouvé pour « {search} »</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="rounded-full text-xs text-moss hover:bg-lemon/10">
              Effacer la recherche
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((c) => (
              <CompetitorCard key={c.id} competitor={c} onRemove={() => handleRemove(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
