import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  buildProfileUrl,
  getPlatformCredential,
  syncCompetitorPlatform,
  type SyncResult,
} from "@/lib/competitor-sync"
import type {
  CompetitorListItem,
  CompetitorPlatform,
  CreateCompetitorInput,
} from "@/types/competitor.type"

function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round(((current - prev) / prev) * 100)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export async function GET() {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: competitors, error: compError } = await supabase
      .from("competitors")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (compError) throw compError

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ competitors: [] })
    }

    const competitorIds = competitors.map((c) => c.id)

    const platformsRes = await supabase
      .from("competitor_platforms")
      .select("*")
      .in("competitor_id", competitorIds)

    const platformRows = platformsRes.data ?? []
    const platformIds = platformRows.map((p) => p.id)

    const statRows = platformIds.length
      ? (await supabase.from("competitor_stats").select("*").in("platform_id", platformIds)).data ?? []
      : []

    const statsByPlatform = new Map<string, any[]>()
    for (const stat of statRows) {
      const list = statsByPlatform.get(stat.platform_id) ?? []
      list.push(stat)
      statsByPlatform.set(stat.platform_id, list)
    }

    const items: CompetitorListItem[] = (competitors ?? []).map((competitor) => {
      const competitorPlatforms = (platformRows ?? []).filter((p) => p.competitor_id === competitor.id)

      const mappedPlatforms: CompetitorPlatform[] = competitorPlatforms.map((p) => ({
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
      }))

      const platformIds = competitorPlatforms.map((p) => p.id)
      const months = new Set<string>()
      for (const platformId of platformIds) {
        for (const stat of statsByPlatform.get(platformId) ?? []) {
          months.add(stat.month)
        }
      }
      const sortedMonths = [...months].sort().reverse()
      const latest = sortedMonths[0]
      const prev = sortedMonths[1]

      const aggregate = (month?: string) => {
        const out = { impressions: 0, likes: 0, comments: 0, shares: 0, posts: 0 }
        if (!month) return out
        for (const platformId of platformIds) {
          for (const stat of statsByPlatform.get(platformId) ?? []) {
            if (stat.month !== month) continue
            out.impressions += Number(stat.impressions ?? 0)
            out.likes += Number(stat.likes ?? 0)
            out.comments += Number(stat.comments ?? 0)
            out.shares += Number(stat.shares ?? 0)
            out.posts += Number(stat.posts ?? 0)
          }
        }
        return out
      }

      const latestAgg = aggregate(latest)
      const prevAgg = aggregate(prev)
      const followers = mappedPlatforms.reduce((sum, p) => sum + p.followers, 0)
      const engagement = latestAgg.impressions > 0
        ? round1(((latestAgg.likes + latestAgg.comments + latestAgg.shares) / latestAgg.impressions) * 100)
        : 0

      return {
        id: competitor.id,
        name: competitor.name,
        industry: competitor.industry ?? "",
        website: competitor.website ?? null,
        verified: competitor.verified ?? false,
        connectedAt: competitor.connected_at,
        platforms: mappedPlatforms,
        totals: {
          followers,
          posts: latestAgg.posts,
          impressions: latestAgg.impressions,
          engagement,
          change: pctChange(latestAgg.impressions, prevAgg.impressions),
        },
      }
    })

    return NextResponse.json({ competitors: items })
  } catch (error) {
    console.error("[competitor/GET] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json()) as CreateCompetitorInput
    const name = body?.name?.trim()
    const platforms = body?.platforms ?? []
    if (!name) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 })
    if (platforms.length === 0) return NextResponse.json({ error: "Au moins une plateforme est requise." }, { status: 400 })

    const now = new Date().toISOString()
    const { data: competitor, error: insertError } = await supabase
      .from("competitors")
      .insert({
        user_id: userId,
        name,
        industry: body.industry?.trim() || null,
        website: body.website?.trim() || null,
        verified: false,
        connected_at: now,
      })
      .select()
      .single()

    if (insertError || !competitor) throw insertError ?? new Error("Failed to create competitor")

    const insertedPlatforms: {
      id: string
      platform: string
      handle: string | null
      profile_url: string | null
    }[] = []

    for (const input of platforms) {
      const handle = input.handle?.trim() || null
      const profileUrl = input.profileUrl?.trim() || buildProfileUrl(input.platform, handle)

      const { data: platformRow, error: platformError } = await supabase
        .from("competitor_platforms")
        .insert({
          competitor_id: competitor.id,
          platform: input.platform,
          handle,
          profile_url: profileUrl,
          followers: 0,
          connected_at: now,
        })
        .select()
        .single()

      if (platformError || !platformRow) continue
      insertedPlatforms.push(platformRow)
    }

    // Synchronise each competitor page with real public data (best-effort).
    const syncResults: SyncResult[] = []
    for (const platformRow of insertedPlatforms) {
      const credential = await getPlatformCredential(supabase, userId, platformRow.platform)
      const result = await syncCompetitorPlatform(supabase, platformRow, credential)
      syncResults.push(result)
    }

    const hasData = syncResults.some((r) => r.ok)
    if (hasData) {
      await supabase.from("competitors").update({ verified: true }).eq("id", competitor.id)
    }

    return NextResponse.json({ competitorId: competitor.id, syncResults }, { status: 201 })
  } catch (error) {
    console.error("[competitor/POST] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
