import type { CompetitorPlatformKey } from "@/types/competitor.type"

export type Platform = CompetitorPlatformKey

export const PLATFORM_META: Record<
  Platform,
  { label: string; color: string; lightBg: string; darkBg: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    lightBg: "bg-blue-50",
    darkBg: "dark:bg-blue-950/40",
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    lightBg: "bg-pink-50",
    darkBg: "dark:bg-pink-950/40",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    lightBg: "bg-sky-50",
    darkBg: "dark:bg-sky-950/40",
  },
  twitter: {
    label: "X (Twitter)",
    color: "#18181B",
    lightBg: "bg-zinc-50",
    darkBg: "dark:bg-zinc-800/40",
  },
  threads: {
    label: "Threads",
    color: "#101010",
    lightBg: "bg-zinc-50",
    darkBg: "dark:bg-zinc-900/40",
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    lightBg: "bg-zinc-50",
    darkBg: "dark:bg-zinc-900/40",
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    lightBg: "bg-red-50",
    darkBg: "dark:bg-red-950/40",
  },
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
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
