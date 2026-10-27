import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  currentMonthKey,
  isMonthKey,
  monthRange,
  monthsBetween,
} from "@/lib/month"
import type {
  CompetitorDetail,
  CompetitorPlatform,
  CompetitorPost,
  CompetitorStat,
} from "@/types/competitor.type"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const { data: competitor, error: compError } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (compError || !competitor) {
      return NextResponse.json({ error: "Concurrent introuvable" }, { status: 404 })
    }

    const { data: platformRows } = await supabase
      .from("competitor_platforms")
      .select("*")
      .eq("competitor_id", id)

    const platforms = platformRows ?? []
    const platformIds = platforms.map((p) => p.id)

    const [{ data: statRows }, { data: postRows }] = await Promise.all([
      platformIds.length
        ? supabase.from("competitor_stats").select("*").in("platform_id", platformIds)
        : Promise.resolve({ data: [] }),
      platformIds.length
        ? supabase.from("competitor_posts").select("*").in("platform_id", platformIds).order("published_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    const stats = statRows ?? []
    const posts = postRows ?? []

    const platformById = new Map<string, any>(platforms.map((p) => [p.id, p]))

    // Available months = from the earliest connection month to the current month.
    const earliestConnected = platforms.length
      ? platforms.map((p) => p.connected_at).sort()[0]
      : competitor.connected_at
    const availableMonths = monthsBetween(earliestConnected, new Date().toISOString()).reverse()

    const requestedMonth = request.nextUrl.searchParams.get("month")
    const month = requestedMonth && isMonthKey(requestedMonth)
      ? (availableMonths.includes(requestedMonth) ? requestedMonth : availableMonths[0] ?? currentMonthKey())
      : availableMonths[0] ?? currentMonthKey()

    const monthIndex = availableMonths.indexOf(month)
    const prevMonth = monthIndex >= 0 && monthIndex < availableMonths.length - 1
      ? availableMonths[monthIndex + 1]
      : null

    const mapPlatform = (p: any): CompetitorPlatform => ({
      id: p.id,
      platform: p.platform,
      handle: p.handle ?? "",
      profileUrl: p.profile_url ?? null,
      profileImage: p.profile_image ?? null,
      providerAccountId: p.provider_account_id ?? null,
      followers: Number(p.followers ?? 0),
      connectedAt: p.connected_at,
      syncedAt: p.synced_at ?? null,
      lastError: p.last_error ?? null,
    })

    const mapStat = (s: any): CompetitorStat => ({
      platform: platformById.get(s.platform_id)?.platform ?? s.platform,
      month: s.month,
      impressions: Number(s.impressions ?? 0),
      likes: Number(s.likes ?? 0),
      comments: Number(s.comments ?? 0),
      shares: Number(s.shares ?? 0),
      posts: Number(s.posts ?? 0),
      followers: Number(s.followers ?? 0),
      engagementRate: Number(s.engagement_rate ?? 0),
    })

    const mapPost = (p: any): CompetitorPost => ({
      id: p.id,
      platform: platformById.get(p.platform_id)?.platform ?? p.platform,
      content: p.content ?? "",
      mediaUrl: p.media_url ?? null,
      publishedAt: p.published_at,
      likes: Number(p.likes ?? 0),
      comments: Number(p.comments ?? 0),
      shares: Number(p.shares ?? 0),
      views: Number(p.views ?? 0),
      engagementRate: Number(p.engagement_rate ?? 0),
    })

    const { start, end } = monthRange(month)
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const monthPosts = posts
      .filter((p) => {
        const t = new Date(p.published_at).getTime()
        return t >= startTime && t < endTime
      })
      .map(mapPost)

    const detail: CompetitorDetail = {
      competitor: {
        id: competitor.id,
        name: competitor.name,
        industry: competitor.industry ?? "",
        website: competitor.website ?? null,
        verified: competitor.verified ?? false,
        connectedAt: competitor.connected_at,
        platforms: platforms.map(mapPlatform),
      },
      availableMonths,
      month,
      stats: stats.filter((s) => s.month === month).map(mapStat),
      prevStats: prevMonth ? stats.filter((s) => s.month === prevMonth).map(mapStat) : [],
      posts: monthPosts,
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("[competitor/[id]/GET] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { error } = await supabase.from("competitors").delete().eq("id", id).eq("user_id", userId)

    if (error) {
      console.error("[competitor/[id]/DELETE] error:", error)
      return NextResponse.json({ error: "Failed to delete competitor" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[competitor/[id]/DELETE] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
