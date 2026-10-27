"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Activity, ArrowUpRight, Eye, Plus, Sparkles, Trash2, TrendingUp, TrendingDown, Users, Search, X } from "lucide-react"
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
        <Button id="add-competitor-btn" className="h-10 gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_8px_24px_rgba(163,230,53,0.18)] hover:-translate-y-0.5 hover:bg-primary">
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
      <article className="group relative h-full overflow-hidden rounded-3xl border border-border/75 bg-card p-5 shadow-[0_14px_38px_rgba(33,52,24,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_48px_rgba(33,52,24,0.12)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-transparent opacity-80" />
        <div className="absolute inset-x-0 top-1 h-20 bg-gradient-to-b from-primary/[0.08] to-transparent" />

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
              className="rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
            >
              {PLATFORM_META[p.platform]?.label ?? p.platform}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <dl className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border/70 bg-background/75 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Abonnés</dt>
            <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-foreground">{formatNumber(totals.followers)}</dd>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Posts</dt>
            <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-foreground">{totals.posts || "—"}</dd>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Eng.</dt>
            <dd className="mt-1.5 text-sm font-extrabold tabular-nums text-foreground">
              {totals.engagement ? `${totals.engagement.toFixed(1)} %` : "—"}
            </dd>
          </div>
        </dl>

        {totals.impressions > 0 && (
          <div className="relative mt-3 flex items-center justify-between rounded-2xl border border-border/70 bg-background/75 px-3 py-2 text-xs">
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
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <header className="relative isolate overflow-hidden rounded-[30px] border border-[#25351f] bg-[#11190f] p-5 text-white shadow-[0_22px_60px_rgba(27,48,18,0.14)] sm:px-7 sm:py-6">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(196,242,100,0.16),transparent_48%)]" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[46%] md:block">
          <Image src="/images/lemon-orbit.png" alt="" fill sizes="(max-width: 768px) 0px, 42vw" className="object-cover object-right opacity-70 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#11190f] via-[#11190f]/50 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#d7f99d]">
              <Eye className="size-3.5" />
              Veille intelligente
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
              Voyez ce qui <span className="text-[#c4f264]">fait du bruit.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Les signaux importants de votre marché, réunis au même endroit. Observez les contenus, les audiences et les tendances qui accélèrent.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-white/75">
                {isLoading ? "Synchronisation…" : `${competitors.length} marque${competitors.length > 1 ? "s" : ""} suivie${competitors.length > 1 ? "s" : ""}`}
              </span>
              {totalFollowers > 0 && <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-white/55">{formatNumber(totalFollowers)} abonnés observés</span>}
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2 lg:max-w-[350px] lg:justify-end">
            {competitors.length > 0 && (
              <div className="relative min-w-[190px] flex-1 lg:flex-none">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <Input
                  id="competitor-search"
                  placeholder="Chercher une marque…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border-white/15 bg-white/[0.07] pl-10 pr-9 text-xs text-white placeholder:text-white/40 focus-visible:border-primary/50 focus-visible:ring-primary/30"
                />
                {search && (
                  <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <X className="size-3.5 text-white/45 hover:text-white" />
                  </button>
                )}
              </div>
            )}
            <AddCompetitorDialog onAdd={handleAdd} />
          </div>
        </div>
      </header>

      <section className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[220px] animate-pulse rounded-3xl border border-border/70 bg-card/70" />
            ))}
          </div>
        ) : competitors.length === 0 ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_16px_42px_rgba(33,52,24,0.06)] sm:p-8">
              <div aria-hidden="true" className="absolute -right-10 -top-12 size-52 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative max-w-xl">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-accent-foreground ring-1 ring-primary/20">
                  <Users className="size-5" />
                </div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Votre radar est prêt</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-foreground sm:text-3xl">Aucune marque sur le radar, pour l&apos;instant.</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Ajoutez un concurrent pour transformer ses comptes publics en signaux utiles — audience, publications et engagement, mois après mois.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-[10px] font-bold text-foreground/70"><span className="text-primary">01</span> Profils publics</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-[10px] font-bold text-foreground/70"><span className="text-primary">02</span> Tendances mensuelles</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-[10px] font-bold text-foreground/70"><span className="text-primary">03</span> Performances comparées</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="flex items-start gap-3 rounded-3xl border border-border/70 bg-card/75 p-4 shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5db] text-[#5b8926]"><Activity className="size-4" /></div>
                <div><h3 className="text-sm font-bold">Ce qui progresse</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Repérez les mouvements d&apos;audience et les variations d&apos;engagement.</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl border border-border/70 bg-card/75 p-4 shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0eaff] text-[#7155ae]"><Sparkles className="size-4" /></div>
                <div><h3 className="text-sm font-bold">Ce qui résonne</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Observez les formats et les messages qui captent l&apos;attention.</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-3xl border border-border/70 bg-card/75 p-4 shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e3] text-[#b16e35]"><ArrowUpRight className="size-4" /></div>
                <div><h3 className="text-sm font-bold">La prochaine occasion</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Transformez vos observations en idées de contenu pertinentes.</p></div>
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/70 p-8 text-center">
            <Search className="size-5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Aucune marque trouvée pour « {search} »</p>
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="rounded-xl">Effacer la recherche</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((c) => (
              <CompetitorCard key={c.id} competitor={c} onRemove={() => handleRemove(c.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
