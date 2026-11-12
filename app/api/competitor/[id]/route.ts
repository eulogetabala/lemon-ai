import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  fetchPublicFollowerCount,
  getPlatformCredential,
  syncCompetitorPlatform,
  usernameFromHandle,
  buildProfileUrl,
  normalizeFacebookPostId,
} from "@/lib/competitor-sync"
import { isSyncDue } from "@/lib/competitor-sync-schedule"
import { aggregatePostsByMonth } from "@/lib/competitor-stats"
import {
  currentMonthKey,
  isMonthKey,
  monthRange,
  monthsBetween,
  prevMonthKey,
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

    const storedPlatforms = platformRows ?? []

    // Backfill a missing audience metric from the public page. A failed provider
    // call (e.g. Graph API 400) used to leave followers at 0 forever, which made
    // the whole overview empty even though the number is publicly available.
    const platforms = await Promise.all(
      storedPlatforms.map(async (p: any) => {
        if (Number(p.followers ?? 0) > 0) return p
        try {
          const live = await fetchPublicFollowerCount(p.platform, p.handle, p.profile_url)
          if (!live || live <= 0) return p
          await supabase.from("competitor_platforms").update({ followers: live }).eq("id", p.id)
          return { ...p, followers: live }
        } catch {
          return p
        }
      }),
    )

    const platformIds = platforms.map((p) => p.id)

    const [{ data: statRows }, { data: postRows }] = await Promise.all([
      platformIds.length
        ? supabase.from("competitor_stats").select("*").in("platform_id", platformIds)
        : Promise.resolve({ data: [] }),
      platformIds.length
        ? supabase.from("competitor_posts").select("*").in("platform_id", platformIds).order("published_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    let stats = statRows ?? []
    let posts = postRows ?? []

    // Auto-refresh : uniquement les plateformes arrivées à échéance. Le délai
    // dépend du réseau (voir lib/competitor-sync-schedule.ts) afin de ne pas
    // marteler LinkedIn à chaque ouverture de la fiche.
    let needsRefresh = false

    for (const pRow of storedPlatforms) {
      if (!isSyncDue(pRow)) continue
      try {
        const cred = await getPlatformCredential(supabase, userId, pRow.platform)
        await syncCompetitorPlatform(supabase, pRow, cred)
        needsRefresh = true
      } catch (err) {
        console.error("[competitor platform auto-sync] error:", err)
      }
    }

    if (needsRefresh) {
      const [{ data: refreshedPlatforms }, { data: refreshedStats }, { data: refreshedPosts }] = await Promise.all([
        supabase.from("competitor_platforms").select("*").eq("competitor_id", id),
        supabase.from("competitor_stats").select("*").in("platform_id", platformIds),
        supabase.from("competitor_posts").select("*").in("platform_id", platformIds).order("published_at", { ascending: false }),
      ])
      if (refreshedPlatforms) {
        for (let i = 0; i < platforms.length; i++) {
          const matched = refreshedPlatforms.find((rp) => rp.id === platforms[i].id)
          if (matched) platforms[i] = matched
        }
      }
      if (refreshedStats) stats = refreshedStats
      if (refreshedPosts && refreshedPosts.length > 0) posts = refreshedPosts
    }

    const platformById = new Map<string, any>(platforms.map((p) => [p.id, p]))

    // Same Facebook post stored twice (numeric id + base64 story id): keep one,
    // with the best metrics, the real text and a usable image.
    const usableImage = (url: string | null) => (url && !url.includes("lookaside.fbsbx.com") ? url : null)
    const merged = new Map<string, any>()
    for (const p of posts) {
      const key = `${p.platform_id}_${normalizeFacebookPostId(String(p.provider_post_id ?? p.id))}`
      const current = merged.get(key)
      const candidate = { ...p, media_url: usableImage(p.media_url) }
      if (!current) {
        merged.set(key, candidate)
        continue
      }
      merged.set(key, {
        ...current,
        content: current.content && current.content !== "Publication officielle" ? current.content : candidate.content,
        media_url: current.media_url ?? candidate.media_url,
        post_url: current.post_url ?? candidate.post_url,
        likes: Math.max(Number(current.likes ?? 0), Number(candidate.likes ?? 0)),
        comments: Math.max(Number(current.comments ?? 0), Number(candidate.comments ?? 0)),
        shares: Math.max(Number(current.shares ?? 0), Number(candidate.shares ?? 0)),
      })
    }
    posts = [...merged.values()].sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))

    // Available months: build from the earliest post or stat date (or at least 6 months back) up to the current month
    const postDates = posts.map((p: any) => p.published_at).filter(Boolean)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    let earliestDate = sixMonthsAgo.toISOString()
    if (postDates.length > 0) {
      const sorted = [...postDates].sort()
      if (sorted[0] < earliestDate) {
        earliestDate = sorted[0]
      }
    }

    const availableMonths = monthsBetween(earliestDate, new Date().toISOString()).reverse()

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

    // Rows by "platformId_month" for follower-growth lookups.
    const statRowByKey = new Map<string, any>()
    const rememberStat = (s: any) => statRowByKey.set(`${s.platform_id}_${s.month}`, s)

    /**
     * New followers for a month = followers at the end of the month (live count
     * for the current month) minus the baseline: the previous month's last
     * recorded count, else the count at the first sync of this month.
     */
    const followerGrowth = (s: any): Pick<CompetitorStat, "followersEnd" | "newFollowers" | "followersBasis"> => {
      const platformRow = platformById.get(s.platform_id)
      const isCurrent = s.month === currentMonthKey()
      const end = isCurrent && Number(platformRow?.followers ?? 0) > 0
        ? Number(platformRow.followers)
        : Number(s.followers ?? 0)
      const prev = statRowByKey.get(`${s.platform_id}_${prevMonthKey(s.month)}`)
      const prevFollowers = Number(prev?.followers ?? 0)
      const start = Number(s.followers_start ?? 0)
      if (end > 0 && prevFollowers > 0) {
        return { followersEnd: end, newFollowers: end - prevFollowers, followersBasis: "prev_month" }
      }
      if (end > 0 && start > 0) {
        return { followersEnd: end, newFollowers: end - start, followersBasis: "tracking_start" }
      }
      return { followersEnd: end, newFollowers: null, followersBasis: null }
    }

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
      ...followerGrowth(s),
    })

    const mapPost = (p: any): CompetitorPost => {
      const platformRow = platformById.get(p.platform_id)
      const platformName = platformRow?.platform ?? p.platform
      let postUrl = p.post_url
      if (!postUrl) {
        const pId = p.provider_post_id ? String(p.provider_post_id) : ""
        if (pId.startsWith("http")) {
          postUrl = pId
        } else if (platformName === "facebook") {
          const slug = usernameFromHandle(platformRow?.handle)
          if (pId.length >= 15) {
            postUrl = `https://www.facebook.com/photo.php?fbid=${pId}`
          } else if (pId && slug) {
            postUrl = `https://www.facebook.com/${slug}/posts/${pId}`
          } else {
            postUrl = platformRow?.profile_url || buildProfileUrl("facebook", slug)
          }
        } else {
          postUrl = platformRow?.profile_url || null
        }
      }

      return {
        id: p.id,
        platform: platformName,
        content: p.content ?? "",
        mediaUrl: p.media_url ?? null,
        postUrl: postUrl ?? null,
        publishedAt: p.published_at,
        likes: Number(p.likes ?? 0),
        comments: Number(p.comments ?? 0),
        shares: Number(p.shares ?? 0),
        views: Number(p.views ?? 0),
        engagementRate: Number(p.engagement_rate ?? 0),
      }
    }

    const { start, end } = monthRange(month)
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const monthPosts = posts
      .filter((p) => {
        const t = new Date(p.published_at).getTime()
        return t >= startTime && t < endTime
      })
      .map(mapPost)

    // A real audience metric without any monthly snapshot left the overview
    // empty. Persist a current-month snapshot so the global view has a home.
    const currentMonth = currentMonthKey()
    const missingSnapshot = platforms.filter(
      (p) => Number(p.followers ?? 0) > 0 && !stats.some((s) => s.platform_id === p.id && s.month === currentMonth),
    )

    for (const platform of missingSnapshot) {
      const snapshot = {
        platform_id: platform.id,
        month: currentMonth,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        posts: 0,
        followers: Number(platform.followers ?? 0),
        followers_start: Number(platform.followers ?? 0),
        engagement_rate: 0,
        synced_at: new Date().toISOString(),
      }
      let { error: snapshotError } = await supabase
        .from("competitor_stats")
        .upsert(snapshot, { onConflict: "platform_id,month" })
      if (snapshotError && /followers_start/.test(snapshotError.message)) {
        const { followers_start: _ignored, ...withoutStart } = snapshot
        ;({ error: snapshotError } = await supabase
          .from("competitor_stats")
          .upsert(withoutStart, { onConflict: "platform_id,month" }))
      }
      if (!snapshotError) stats.push(snapshot)
    }

    // Ensure monthly stats are accurately populated from posts if competitor_stats was empty or zeroed
    const statsMap = new Map<string, any>()
    for (const s of stats) {
      const pRow = platformById.get(s.platform_id)
      const platformName = pRow?.platform ?? s.platform
      statsMap.set(`${platformName}_${s.month}`, s)
    }

    for (const p of platforms) {
      const platformPosts = posts.filter((post: any) => post.platform_id === p.id)
      if (platformPosts.length > 0) {
        const monthlyAggs = aggregatePostsByMonth(
          platformPosts.map((post: any) => ({
            publishedAt: post.published_at,
            likes: Number(post.likes ?? 0),
            comments: Number(post.comments ?? 0),
            shares: Number(post.shares ?? 0),
            views: Number(post.views ?? 0),
            impressions: Number(post.impressions ?? 0),
          })),
          Number(p.followers ?? 0),
        )

        for (const agg of monthlyAggs) {
          const key = `${p.platform}_${agg.month}`
          const existing = statsMap.get(key)
          if (!existing || (Number(existing.posts ?? 0) === 0 && agg.posts > 0)) {
            statsMap.set(key, {
              ...existing,
              platform_id: p.id,
              platform: p.platform,
              month: agg.month,
              impressions: agg.impressions,
              likes: agg.likes,
              comments: agg.comments,
              shares: agg.shares,
              posts: agg.posts,
              followers: Number(existing?.followers ?? 0),
              engagement_rate: agg.engagementRate,
            })
          }
        }
      }
    }

    const effectiveStats = [...statsMap.values()]
    effectiveStats.forEach(rememberStat)

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
      stats: effectiveStats.filter((s) => s.month === month).map(mapStat),
      prevStats: prevMonth ? effectiveStats.filter((s) => s.month === prevMonth).map(mapStat) : [],
      posts: monthPosts,
      allStats: effectiveStats.map(mapStat),
      allPosts: posts.map(mapPost),
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("[competitor/[id]/GET] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    // 1. Update basic info if provided
    const updatePayload: Record<string, any> = {}
    if (body.name?.trim()) updatePayload.name = body.name.trim()
    if (body.industry !== undefined) updatePayload.industry = body.industry?.trim() || null
    if (body.website !== undefined) updatePayload.website = body.website?.trim() || null

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("competitors").update(updatePayload).eq("id", id).eq("user_id", userId)
    }

    // 2. Add a new platform channel if provided
    if (body.newPlatform) {
      const { platform, handle, profileUrl } = body.newPlatform
      const cleanedSlug = usernameFromHandle(handle)
      const cleanedHandle = cleanedSlug || (handle ?? "").trim().replace(/^@/, "")
      const fullProfileUrl = profileUrl?.trim() || buildProfileUrl(platform, cleanedSlug)

      const { data: newRow, error: pError } = await supabase
        .from("competitor_platforms")
        .insert({
          competitor_id: id,
          platform,
          handle: cleanedHandle,
          profile_url: fullProfileUrl,
          followers: 0,
          connected_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!pError && newRow) {
        try {
          const cred = await getPlatformCredential(supabase, userId, platform)
          await syncCompetitorPlatform(supabase, newRow, cred)
        } catch (err) {
          console.error("[PATCH add platform sync error]", err)
        }
      }
    }

    // 3. Remove an individual platform channel if requested
    if (body.removePlatformId) {
      await supabase
        .from("competitor_platforms")
        .delete()
        .eq("id", body.removePlatformId)
        .eq("competitor_id", id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[competitor/[id]/PATCH] error:", error)
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
