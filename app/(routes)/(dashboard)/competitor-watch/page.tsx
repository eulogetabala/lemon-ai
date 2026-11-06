"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Users, Search, X, Radar } from "lucide-react"
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
import { usernameFromHandle, buildProfileUrl } from "@/lib/competitor-stats"
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
    if (!value && fallbackHandle) return usernameFromHandle(fallbackHandle)
    return usernameFromHandle(value)
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
        <Button id="add-competitor-btn" className="rounded-full h-9 px-4 text-xs gap-1.5 font-bold bg-lemon text-white hover:bg-lemon/90 shadow-[0_6px_20px_-4px_rgba(255,87,34,0.4)] hover:-translate-y-0.5 transition-all duration-200">
          <Plus className="size-3.5" />
          Ajouter un concurrent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[720px] rounded-[30px] border border-[#E8E8E2] bg-white p-0 shadow-[0_30px_70px_rgba(17,20,16,0.12)] sm:max-w-[720px]">
        <div className="px-6 pb-6 pt-5 sm:px-7">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-[2.1rem] font-black leading-none tracking-[-0.06em] text-ink">Nouveau concurrent</DialogTitle>
              <button
                type="button"
                aria-label="Fermer"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-[#F4F5F1] hover:text-ink"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <DialogDescription className="max-w-[580px] text-base leading-relaxed text-ink/70">
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

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-12 min-w-[130px] rounded-full border border-[#E8E8E2] bg-[#F2F3EE] text-base font-semibold text-ink hover:bg-[#E8EAE2]">
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim() || platforms.length === 0 || isSubmitting} className="h-12 min-w-[130px] rounded-full bg-[#FF5722] text-base font-bold text-white hover:bg-[#F4511E]">
              {isSubmitting ? "Synchronisation…" : "Ajouter"}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditCompetitorDialog({
  competitor,
  open,
  onOpenChange,
  onUpdated,
}: {
  competitor: CompetitorListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}) {
  const [name, setName] = useState("")
  const [industry, setIndustry] = useState("")
  const [website, setWebsite] = useState("")
  const [newPlatformKey, setNewPlatformKey] = useState<CompetitorPlatformKey>("linkedin")
  const [newPlatformHandle, setNewPlatformHandle] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingChannel, setIsAddingChannel] = useState(false)

  useEffect(() => {
    if (competitor) {
      setName(competitor.name)
      setIndustry(competitor.industry || "")
      setWebsite(competitor.website || "")
      setNewPlatformHandle("")
    }
  }, [competitor])

  if (!competitor) return null

  const handleSaveInfo = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/competitor/${competitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, website }),
      })
      onUpdated()
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNewChannel = async () => {
    if (!newPlatformHandle.trim()) return
    setIsAddingChannel(true)
    try {
      const slug = usernameFromHandle(newPlatformHandle)
      await fetch(`/api/competitor/${competitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPlatform: {
            platform: newPlatformKey,
            handle: slug || newPlatformHandle.trim(),
            profileUrl: newPlatformHandle.startsWith("http") ? newPlatformHandle.trim() : buildProfileUrl(newPlatformKey, slug),
          },
        }),
      })
      setNewPlatformHandle("")
      onUpdated()
    } finally {
      setIsAddingChannel(false)
    }
  }

  const handleRemoveChannel = async (platformId: string) => {
    if (competitor.platforms.length <= 1) {
      alert("Un concurrent doit avoir au moins un canal actif.")
      return
    }
    await fetch(`/api/competitor/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removePlatformId: platformId }),
    })
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            Gérer le concurrent — {competitor.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modifiez les informations générales ou ajoutez de nouveaux canaux à surveiller.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-5">
          {/* 1. Informations générales */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Informations générales
            </h4>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-600">Nom du concurrent</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Banque de l'Habitat"
                className="h-10 text-xs rounded-xl bg-white border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Secteur</label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Ex : Banque, Fintech"
                  className="h-10 text-xs rounded-xl bg-white border-slate-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Site web</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="h-10 text-xs rounded-xl bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* 2. Canaux sociaux connectés */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Canaux actuellement sous surveillance ({competitor.platforms.length})
            </h4>
            <div className="flex flex-col gap-2">
              {competitor.platforms.map((p) => {
                const meta = PLATFORM_META[p.platform]
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-2 rounded-full bg-[#FF5722]" />
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {meta?.label || p.platform}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        @{p.handle || "—"}
                      </span>
                      {p.followers > 0 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {formatNumber(p.followers)} abonnés
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => p.id && handleRemoveChannel(p.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      title="Supprimer ce canal"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. Ajouter un nouveau canal */}
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-orange-500/30 bg-orange-50/20 p-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="size-3.5 text-[#FF5722]" />
              Ajouter un canal social pour {competitor.name}
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newPlatformKey}
                onChange={(e) => setNewPlatformKey(e.target.value as CompetitorPlatformKey)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF5722]/30"
              >
                {(Object.keys(PLATFORM_META) as CompetitorPlatformKey[]).map((key) => (
                  <option key={key} value={key}>
                    {PLATFORM_META[key].label}
                  </option>
                ))}
              </select>
              <Input
                value={newPlatformHandle}
                onChange={(e) => setNewPlatformHandle(e.target.value)}
                placeholder="Ex: @nom_page ou URL officielle"
                className="h-10 flex-1 text-xs rounded-xl bg-white border-slate-200"
              />
              <button
                type="button"
                onClick={handleAddNewChannel}
                disabled={!newPlatformHandle.trim() || isAddingChannel}
                className="h-10 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
              >
                {isAddingChannel ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Fermer
            </Button>
            <Button
              onClick={handleSaveInfo}
              disabled={isSaving || !name.trim()}
              className="h-10 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-xs font-bold text-white cursor-pointer"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCompetitorDialog({
  competitor,
  open,
  onOpenChange,
  onConfirm,
}: {
  competitor: CompetitorListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  if (!competitor) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-2">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="text-base font-black text-slate-900">
            Supprimer la veille de {competitor.name} ?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Cette action supprimera définitivement ce concurrent ainsi que l&apos;ensemble de ses publications et métriques associées.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2.5 mt-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-10 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white cursor-pointer"
          >
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompetitorCard({
  competitor,
  onEdit,
  onRemove,
}: {
  competitor: CompetitorListItem
  onEdit: () => void
  onRemove: () => void
}) {
  const { totals } = competitor

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#FF5722]/50 hover:shadow-xl hover:shadow-orange-500/10">
      {/* Top subtle orange accent highlight */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FF5722]/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div>
        {/* Top Header with Avatar, Name & Action Icons */}
        <div className="flex items-start justify-between gap-3">
          <Link href={`/competitor-watch/${competitor.id}`} className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A0D14] text-white font-black text-sm shadow-sm group-hover:bg-[#FF5722] transition-colors">
              {competitor.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-black text-slate-900 group-hover:text-[#FF5722] transition-colors">
                  {competitor.name}
                </h2>
                {competitor.verified && (
                  <span className="rounded-full bg-orange-50 border border-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-[#FF5722]">
                    Actif
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-400">{competitor.industry || "Secteur non renseigné"}</p>
            </div>
          </Link>

          {/* Action icons: Edit & Delete */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit()
              }}
              className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              title="Modifier le concurrent ou ajouter un canal"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
              className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              title="Supprimer ce concurrent"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Connected social channels */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {competitor.platforms.map((p) => {
            const meta = PLATFORM_META[p.platform]
            return (
              <span
                key={p.platform}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize"
              >
                <span>{meta?.label || p.platform}</span>
                {p.handle && (
                  <span className="text-slate-400 font-normal">
                    @{p.handle.replace(/^@/, "")}
                  </span>
                )}
              </span>
            )
          })}
        </div>

        {/* Real Metrics Grid (Abonnés, Posts, Eng.) */}
        <Link href={`/competitor-watch/${competitor.id}`} className="block">
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Abonnés</dt>
              <dd className="mt-1 text-sm font-black tabular-nums text-slate-900">
                {totals.followers > 0 ? formatNumber(totals.followers) : "—"}
              </dd>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Posts</dt>
              <dd className="mt-1 text-sm font-black tabular-nums text-slate-900">
                {totals.posts > 0 ? totals.posts : "—"}
              </dd>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eng.</dt>
              <dd className="mt-1 text-sm font-black tabular-nums text-[#FF5722]">
                {totals.engagement > 0 ? `${totals.engagement.toFixed(1)} %` : "—"}
              </dd>
            </div>
          </dl>
        </Link>
      </div>

      {/* Card Footer: Impressions volume and click through link */}
      <Link href={`/competitor-watch/${competitor.id}`} className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500 text-[11px]">
          {totals.impressions > 0 ? `${formatNumber(totals.impressions)} impressions` : "Flux public actif"}
        </span>
        <span className="text-[#FF5722] text-[11px] font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
          Voir l&apos;audit complet →
        </span>
      </Link>
    </article>
  )
}

export default function CompetitorWatchPage() {
  const [competitors, setCompetitors] = useState<CompetitorListItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorListItem | null>(null)
  const [deletingCompetitor, setDeletingCompetitor] = useState<CompetitorListItem | null>(null)

  const loadCompetitors = async () => {
    try {
      const res = await fetch("/api/competitor")
      if (res.ok) {
        const data = await res.json()
        setCompetitors(data?.competitors ?? [])
      }
    } catch {
      setCompetitors([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompetitors()
  }, [])

  const handleAdd = async (payload: NewCompetitorPayload) => {
    const res = await fetch("/api/competitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to create competitor")
    await loadCompetitors()
  }

  const handleRemove = async () => {
    if (!deletingCompetitor) return
    await fetch(`/api/competitor/${deletingCompetitor.id}`, { method: "DELETE" })
    setCompetitors((prev) => prev.filter((c) => c.id !== deletingCompetitor.id))
    setDeletingCompetitor(null)
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
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0A0D14] text-white shadow-sm">
            <Radar className="size-5 text-[#FF5722]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Veille concurrentielle</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {isLoading
                ? "Chargement…"
                : `${competitors.length} concurrent${competitors.length > 1 ? "s" : ""} suivi${competitors.length > 1 ? "s" : ""}${totalFollowers > 0 ? ` · ${formatNumber(totalFollowers)} abonnés cumulés` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {competitors.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                id="competitor-search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-52 pl-9 text-xs rounded-xl bg-white border-slate-200 focus:border-[#FF5722] transition-colors"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <X className="size-3.5 text-slate-400 hover:text-slate-900 transition-colors" />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[220px] rounded-2xl border border-slate-200 bg-slate-50/50 animate-pulse" />
            ))}
          </div>
        ) : competitors.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Users className="size-6 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Aucun concurrent ajouté</p>
              <p className="text-sm text-slate-500 mt-1">Commencez par ajouter une marque concurrente à surveiller.</p>
            </div>
            <AddCompetitorDialog onAdd={handleAdd} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm text-slate-500">Aucun concurrent trouvé pour « {search} »</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="rounded-xl text-xs text-[#FF5722] hover:bg-orange-50 cursor-pointer">
              Effacer la recherche
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((c) => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                onEdit={() => setEditingCompetitor(c)}
                onRemove={() => setDeletingCompetitor(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditCompetitorDialog
        competitor={editingCompetitor}
        open={!!editingCompetitor}
        onOpenChange={(open) => !open && setEditingCompetitor(null)}
        onUpdated={loadCompetitors}
      />

      <DeleteCompetitorDialog
        competitor={deletingCompetitor}
        open={!!deletingCompetitor}
        onOpenChange={(open) => !open && setDeletingCompetitor(null)}
        onConfirm={handleRemove}
      />
    </div>
  )
}
