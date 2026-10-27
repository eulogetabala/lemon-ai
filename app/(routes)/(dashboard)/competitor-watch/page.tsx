"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2, TrendingUp, TrendingDown, Users, Search, X } from "lucide-react"
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
        <Button id="add-competitor-btn" className="rounded-full h-8 px-4 text-xs gap-1.5 font-semibold">
          <Plus className="size-3.5" />
          Ajouter un concurrent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau concurrent</DialogTitle>
          <DialogDescription>
            Saisissez la page du concurrent à surveiller. Ses données publiques seront synchronisées mois par mois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom de la marque</label>
            <Input id="comp-name" placeholder="ex : Nike" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Secteur (optionnel)</label>
            <Input id="comp-industry" placeholder="ex : Sport & Lifestyle" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Réseaux à suivre</label>
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
                      "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      selected ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span>{PLATFORM_META[p].label}</span>
                    {selected && <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">On</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Identifiants par plateforme</label>
              <span className="text-xs text-muted-foreground">
                {platforms.length} sélectionnée{platforms.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {platforms.map((platform) => (
                <div key={platform} className="rounded-xl border border-border bg-muted/20 p-3">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {PLATFORM_META[platform].label}
                  </label>
                  <Input
                    value={platformHandles[platform] ?? ""}
                    onChange={(e) => setPlatformHandles((prev) => ({ ...prev, [platform]: e.target.value }))}
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim() || platforms.length === 0 || isSubmitting}>
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
      <article className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] dark:bg-[#0d1526]/70 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(163,230,53,0.1)]">
        {/* Top lime accent gradient */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.05] to-transparent" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0 ring-2 ring-white/8">
              <AvatarFallback className="bg-gradient-to-br from-primary to-[#84cc16] text-sm font-bold text-primary-foreground">
                {competitor.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold text-foreground/90">{competitor.name}</h2>
                {competitor.verified && (
                  <span className="rounded-full bg-primary/12 border border-primary/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    Connecté
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-foreground/40">{competitor.industry || "—"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
            className="rounded-lg p-1.5 text-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
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
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-foreground/50"
            >
              {PLATFORM_META[p.platform]?.label ?? p.platform}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <dl className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-foreground/35 font-semibold">Abonnés</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-foreground/80">{formatNumber(totals.followers)}</dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-foreground/35 font-semibold">Posts</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-foreground/80">{totals.posts || "—"}</dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-foreground/35 font-semibold">Eng.</dt>
            <dd className="mt-1.5 text-sm font-bold tabular-nums text-foreground/80">
              {totals.engagement ? `${totals.engagement.toFixed(1)} %` : "—"}
            </dd>
          </div>
        </dl>

        {totals.impressions > 0 && (
          <div className="relative mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs">
            <span className="text-foreground/40 tabular-nums">{formatNumber(totals.impressions)} impressions</span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                totals.change >= 0 ? "text-emerald-400" : "text-destructive",
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
    <div className="w-full min-h-full py-2">
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] dark:bg-[#070d1a]/50 bg-card">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:px-7 relative overflow-hidden">
          {/* Lime top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/[0.04] to-transparent" />

          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/35">Dashboard</p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-foreground">Veille concurrentielle</h1>
            <p className="mt-1 text-xs text-foreground/40">
              {isLoading
                ? "Chargement…"
                : `${competitors.length} concurrent${competitors.length > 1 ? "s" : ""} suivi${competitors.length > 1 ? "s" : ""}${totalFollowers > 0 ? ` · ${formatNumber(totalFollowers)} abonnés cumulés` : ""}`}
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            {competitors.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/30" />
                <Input
                  id="competitor-search"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-44 pl-9 text-xs rounded-full bg-white/5 border-white/10 focus:border-primary/50"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="size-3.5 text-foreground/40 hover:text-foreground/70" />
                  </button>
                )}
              </div>
            )}
            <AddCompetitorDialog onAdd={handleAdd} />
          </div>
        </header>

        {/* Content */}
        <div className="px-6 py-5 sm:px-7">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[200px] rounded-2xl border border-white/[0.07] bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Users className="size-6 text-foreground/30" />
              </div>
              <div>
                <p className="font-semibold text-foreground/80">Aucun concurrent ajouté</p>
                <p className="text-sm text-foreground/40 mt-1">Commencez par ajouter une marque à surveiller.</p>
              </div>
              <AddCompetitorDialog onAdd={handleAdd} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <p className="text-sm text-foreground/40">Aucun concurrent trouvé pour « {search} »</p>
              <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="rounded-full text-xs">
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
    </div>
  )
}
