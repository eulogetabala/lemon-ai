import type { CompetitorPlatformKey } from "@/types/competitor.type"

export type Platform = CompetitorPlatformKey

export const PLATFORM_META: Record<
  Platform,
  { label: string; color: string; lightBg: string; darkBg: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  instagram: {
    label: "Instagram",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  twitter: {
    label: "X (Twitter)",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  threads: {
    label: "Threads",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  tiktok: {
    label: "TikTok",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
  youtube: {
    label: "YouTube",
    color: "#0F172A",
    lightBg: "bg-slate-100",
    darkBg: "dark:bg-slate-900/60",
  },
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("fr-FR")
}

export function getPrevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function formatMonth(month: string) {
  const [y, m] = month.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return "À l'instant"
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round(((current - prev) / prev) * 100)
}
