import type { SupabaseClient } from "@supabase/supabase-js"
import { ChannelTypeEnum } from "@/constants/channels"
import { decrypt, encrypt } from "@/lib/encryption"
import { getOAuthProvider } from "@/lib/social-oauth"
import { aggregatePostsByMonth, postEngagementRate } from "@/lib/competitor-stats"

type FetchedPost = {
  providerPostId: string
  content: string
  mediaUrl?: string | null
  publishedAt: string
  likes: number
  comments: number
  shares: number
  views: number
  impressions: number
}

type FetchedPage = {
  followers?: number
  posts: FetchedPost[]
  note?: string
}

export type SyncResult = {
  ok: boolean
  error?: string
  note?: string
  months?: string[]
  postsCount?: number
}

export type CompetitorPlatformRow = {
  id: string
  platform: string
  handle: string | null
  profile_url: string | null
}

type Credential = { token: string } | null

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Provider API ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

function usernameFromHandle(handle: string | null) {
  return (handle ?? "").trim().replace(/^@/, "")
}

export function buildProfileUrl(platform: string, handle: string | null): string | null {
  const slug = usernameFromHandle(handle)
  if (!slug) return null
  // Display names (e.g. "Euloge TABALA MABANDZA") are not valid URL slugs.
  if (/\s/.test(slug)) return null
  switch (platform) {
    case "twitter":
      return `https://x.com/${slug}`
    case "instagram":
      return `https://instagram.com/${slug}`
    case "facebook":
      return `https://facebook.com/${slug}`
    case "linkedin":
      return `https://linkedin.com/company/${slug}`
    case "tiktok":
      return `https://tiktok.com/@${slug}`
    case "youtube":
      return `https://youtube.com/@${slug}`
    case "threads":
      return `https://threads.net/@${slug}`
    default:
      return null
  }
}

// ─── Provider adapters — each targets the COMPETITOR page (not the user) ──────

async function fetchTwitterPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const name = usernameFromHandle(row.handle)
  if (!name) return { posts: [], note: "Identifiant X manquant." }
  if (!cred?.token) {
    return { posts: [], note: "Connectez votre compte X pour autoriser la lecture des profils publics." }
  }

  const auth = { headers: { Authorization: `Bearer ${cred.token}` } }
  const user = await fetchJson(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(name)}?user.fields=profile_image_url,public_metrics`,
    auth,
  )
  const userId = user?.data?.id
  if (!userId) return { posts: [], note: "Profil X introuvable." }

  const followers = user.data.public_metrics?.followers_count
  const tweets = await fetchJson(
    `https://api.x.com/2/users/${userId}/tweets?tweet.fields=public_metrics,created_at,text&max_results=100`,
    auth,
  )
  const posts: FetchedPost[] = (tweets?.data ?? []).map((t: any) => ({
    providerPostId: t.id,
    content: t.text ?? "",
    mediaUrl: null,
    publishedAt: t.created_at ?? new Date().toISOString(),
    likes: t.public_metrics?.like_count ?? 0,
    comments: t.public_metrics?.reply_count ?? 0,
    shares: t.public_metrics?.retweet_count ?? 0,
    views: t.public_metrics?.impression_count ?? 0,
    impressions: t.public_metrics?.impression_count ?? 0,
  }))

  return { followers, posts }
}

function extractFacebookPageId(url: string | null) {
  if (!url) return null
  const match = url.match(/facebook\.com\/(?:pages\/[^/]+\/)?([0-9]+)/)
  return match ? match[1] : null
}

async function fetchFacebookPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  if (!cred?.token) {
    return { posts: [], note: "Connectez votre compte Facebook pour autoriser la lecture des pages publiques." }
  }

  const auth = { headers: { Authorization: `Bearer ${cred.token}` } }
  let pageId = extractFacebookPageId(row.profile_url)
  let followers: number | undefined

  if (!pageId) {
    const q = usernameFromHandle(row.handle)
    if (!q) return { posts: [], note: "Nom ou URL Facebook manquant." }
    const search = await fetchJson(
      `https://graph.facebook.com/v19.0/search?type=page&q=${encodeURIComponent(q)}&fields=id,name,fan_count&limit=1`,
      auth,
    )
    const page = search?.data?.[0]
    if (!page) return { posts: [], note: "Page Facebook introuvable." }
    pageId = page.id
    followers = page.fan_count
  } else {
    const page = await fetchJson(
      `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,fan_count`,
      auth,
    )
    followers = page?.fan_count
  }

  const feed = await fetchJson(
    `https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,created_time,full_picture,shares,likes.summary(true),comments.summary(true)&limit=100`,
    auth,
  )
  const posts: FetchedPost[] = (feed?.data ?? []).map((p: any) => ({
    providerPostId: p.id,
    content: p.message ?? "",
    mediaUrl: p.full_picture ?? null,
    publishedAt: p.created_time ?? new Date().toISOString(),
    likes: p.likes?.summary?.total_count ?? 0,
    comments: p.comments?.summary?.total_count ?? 0,
    shares: p.shares?.count ?? 0,
    views: 0,
    impressions: 0,
  }))

  return { followers, posts }
}

async function fetchInstagramPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const username = usernameFromHandle(row.handle)
  if (!username) return { posts: [], note: "Identifiant Instagram manquant." }
  if (!cred?.token) {
    return {
      posts: [],
      note: "Connectez votre compte Facebook (avec un compte Instagram Business lié) pour activer Business Discovery.",
    }
  }

  const auth = { headers: { Authorization: `Bearer ${cred.token}` } }

  // 1. Find the user's Facebook page exposing an Instagram business account.
  const accounts = await fetchJson(
    "https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account",
    auth,
  )
  const igId = accounts?.data?.find(
    (p: any) => p.instagram_business_account?.id,
  )?.instagram_business_account?.id
  if (!igId) {
    return { posts: [], note: "Aucun compte Instagram Business lié à vos pages Facebook." }
  }

  // 2. Business Discovery — read the competitor's public profile + media.
  const fields = `business_discovery.username(${username}){followers_count,media_count,media.limit(50){id,caption,media_type,media_url,timestamp,like_count,comments_count}}`
  const discovery = await fetchJson(
    `https://graph.facebook.com/v19.0/${igId}?fields=${encodeURIComponent(fields)}`,
    auth,
  )
  const bd = discovery?.business_discovery
  if (!bd) return { posts: [], note: "Profil Instagram introuvable via Business Discovery." }

  const posts: FetchedPost[] = (bd.media?.data ?? []).map((m: any) => ({
    providerPostId: m.id,
    content: m.caption ?? "",
    mediaUrl:
      m.media_type === "IMAGE" || m.media_type === "VIDEO" || m.media_type === "CAROUSEL_ALBUM"
        ? m.media_url ?? null
        : null,
    publishedAt: m.timestamp ?? new Date().toISOString(),
    likes: m.like_count ?? 0,
    comments: m.comments_count ?? 0,
    shares: 0,
    views: 0,
    impressions: 0,
  }))

  return { followers: bd.followers_count, posts }
}

async function fetchLinkedinPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const slug = usernameFromHandle(row.handle)
  if (!slug) return { posts: [], note: "Identifiant de page LinkedIn manquant." }
  if (!cred?.token) {
    return {
      posts: [],
      note: "Connectez un compte LinkedIn disposant de l'accès API Marketing (r_organization_social).",
    }
  }

  const auth = {
    headers: {
      Authorization: `Bearer ${cred.token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      Accept: "application/json",
    },
  }

  // 1. Resolve the organization by vanity name.
  const org = await fetchJson(
    `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${encodeURIComponent(slug)}`,
    auth,
  )
  const orgUrn = org?.elements?.[0]?.id
  if (!orgUrn) return { posts: [], note: "Page LinkedIn introuvable." }

  // 2. Follower statistics (sum across regions/countries).
  const followersData = await fetchJson(
    `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${orgUrn}`,
    auth,
  )
  const followers = (followersData?.elements ?? []).reduce((sum: number, e: any) => {
    const regions = e.followerCountsByRegion ?? e.followerCountsByCountry ?? []
    return sum + regions.reduce((s: number, r: any) => s + (r.followerCounts?.[0]?.count ?? 0), 0)
  }, 0)

  // 3. Posts published by the organization.
  const postsData = await fetchJson(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${orgUrn})&count=50`,
    auth,
  )
  const posts: FetchedPost[] = (postsData?.elements ?? []).map((p: any) => {
    const share = p.specificContent?.["com.linkedin.ugc.ShareContent"]
    const media = share?.media?.[0]
    return {
      providerPostId: p.id,
      content: share?.shareCommentary?.text ?? "",
      mediaUrl: media?.originalUrl ?? null,
      publishedAt: p.created?.time ? new Date(p.created.time).toISOString() : new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      impressions: 0,
    }
  })

  return {
    followers: followers || undefined,
    posts,
    note: "Les métriques d'engagement par publication LinkedIn nécessitent des appels supplémentaires (socialActions).",
  }
}

async function fetchTiktokPage(_row: CompetitorPlatformRow, _cred: Credential): Promise<FetchedPage> {
  return {
    posts: [],
    note: "TikTok ne permet pas de lire le profil d'un concurrent via l'API actuelle.",
  }
}

type Adapter = (row: CompetitorPlatformRow, cred: Credential) => Promise<FetchedPage>

const ADAPTERS: Record<string, Adapter> = {
  twitter: fetchTwitterPage,
  instagram: fetchInstagramPage,
  facebook: fetchFacebookPage,
  linkedin: fetchLinkedinPage,
  tiktok: fetchTiktokPage,
}

const PLATFORM_TO_CHANNEL: Record<string, ChannelTypeEnum> = {
  twitter: ChannelTypeEnum.TWITTER,
  instagram: ChannelTypeEnum.INSTAGRAM,
  facebook: ChannelTypeEnum.FACEBOOK,
  linkedin: ChannelTypeEnum.LINKEDIN,
  threads: ChannelTypeEnum.THREADS,
  tiktok: ChannelTypeEnum.TIKTOK,
  youtube: ChannelTypeEnum.YOUTUBE,
}

/**
 * Obtains the user's connected token for a platform — used ONLY as an API
 * credential to read public competitor pages (never as the data source).
 */
export async function getPlatformCredential(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
): Promise<Credential> {
  // Instagram competitor data flows through the Facebook Graph API, so we use
  // the user's FACEBOOK token (with instagram_basic + instagram_manage_insights).
  const credentialPlatform = platform === "instagram" ? "facebook" : platform

  const typeRes = await supabase
    .from("channel_types")
    .select("id")
    .eq("type", credentialPlatform)
    .single()
  const typeId = typeRes.data?.id
  if (!typeId) return null

  const chRes = await supabase
    .from("user_channels")
    .select("*")
    .eq("user_id", userId)
    .eq("channel_type_id", typeId)
    .eq("is_connected", true)
    .single()

  const channel = chRes.data
  if (!channel?.access_token) return null

  const token = decrypt(channel.access_token)
  if (!token) return null

  const expiresAt = channel.token_expires_at ? new Date(channel.token_expires_at).getTime() : 0
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    const refreshToken = decrypt(channel.refresh_token)
    const provider = getOAuthProvider(PLATFORM_TO_CHANNEL[platform])
    if (refreshToken && provider) {
      try {
        const refreshed = await provider.refreshToken({ refreshToken })
        await supabase
          .from("user_channels")
          .update({
            access_token: encrypt(refreshed.accessToken),
            refresh_token: encrypt(refreshed.refreshToken ?? refreshToken),
            token_expires_at: refreshed.expiresAt,
          })
          .eq("id", channel.id)
        return { token: refreshed.accessToken }
      } catch {
        // fall through to the (possibly expired) token — the provider will reject it
      }
    }
  }

  return { token }
}

export async function syncCompetitorPlatform(
  supabase: SupabaseClient,
  row: CompetitorPlatformRow,
  credential: Credential,
): Promise<SyncResult> {
  const adapter = ADAPTERS[row.platform]
  if (!adapter) return { ok: false, error: `Plateforme non supportée: ${row.platform}` }

  let page: FetchedPage
  try {
    page = await adapter(row, credential)
  } catch (fetchError) {
    const message = (fetchError as Error).message
    await supabase
      .from("competitor_platforms")
      .update({ synced_at: new Date().toISOString(), last_error: message })
      .eq("id", row.id)
    return { ok: false, error: message }
  }

  // Store real followers (when the provider exposes them).
  await supabase
    .from("competitor_platforms")
    .update({
      followers: typeof page.followers === "number" ? page.followers : undefined,
      synced_at: new Date().toISOString(),
      last_error: page.note ?? null,
    })
    .eq("id", row.id)

  // Upsert real posts, deduplicated by provider post id.
  for (const post of page.posts) {
    await supabase.from("competitor_posts").upsert(
      {
        platform_id: row.id,
        provider_post_id: post.providerPostId,
        content: post.content,
        media_url: post.mediaUrl ?? null,
        published_at: post.publishedAt,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        views: post.views,
        engagement_rate: postEngagementRate(post),
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id,provider_post_id" },
    )
  }

  // Aggregate the fetched posts into monthly snapshots (real, per month).
  const months = aggregatePostsByMonth(page.posts)

  for (const agg of months) {
    await supabase.from("competitor_stats").upsert(
      {
        platform_id: row.id,
        month: agg.month,
        impressions: agg.impressions,
        likes: agg.likes,
        comments: agg.comments,
        shares: agg.shares,
        posts: agg.posts,
        followers: 0,
        engagement_rate: agg.engagementRate,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id,month" },
    )
  }

  return {
    ok: true,
    note: page.note,
    months: months.map((m) => m.month),
    postsCount: page.posts.length,
  }
}
