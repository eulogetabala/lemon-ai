import type { SupabaseClient } from "@supabase/supabase-js"
import { ChannelTypeEnum } from "@/constants/channels"
import { decrypt, encrypt } from "@/lib/encryption"
import { getOAuthProvider } from "@/lib/social-oauth"
import { aggregatePostsByMonth, postEngagementRate } from "@/lib/competitor-stats"

type FetchedPost = {
  providerPostId: string
  content: string
  mediaUrl?: string | null
  postUrl?: string | null
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
  const value = (handle ?? "").trim().replace(/^@/, "")
  if (!value) return ""

  const urlMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|x\.com|twitter\.com|instagram\.com|linkedin\.com|tiktok\.com|threads\.net|youtube\.com)\/(?:@)?([^/?#]+)$/i)
  if (urlMatch?.[1]) return urlMatch[1].replace(/\/$/, "")

  const pathMatch = value.match(/\/([^/?#]+)$/)
  if (pathMatch?.[1]) return pathMatch[1].replace(/\/$/, "")

  return value
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
    postUrl: `https://x.com/${name}/status/${t.id}`,
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

async function fetchPublicFacebookInfo(slug: string): Promise<number | undefined> {
  if (!slug) return undefined

  try {
    const res = await fetch(`https://www.facebook.com/${encodeURIComponent(slug)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })

    if (!res.ok) return undefined
    const html = await res.text()

    const descriptionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    const description = descriptionMatch?.[1] ?? ""
    const cleaned = description.replace(/&nbsp;|&#xA0;|&#160;|&#x202f;|&#8239;/gi, " ")
      .replace(/&amp;/gi, "&")

    const patterns = [
      /([0-9][0-9\s\u202f\.,]+)\s*(?:followers|abonnés|people like this)/i,
      /([0-9][0-9\s\u202f\.,]+)\s*(?:followers|abonnés)/i,
      /([0-9][0-9\s\u202f\.,]+)\s*(?:en parlent)/i,
    ]

    for (const pattern of patterns) {
      const match = cleaned.match(pattern)
      if (match?.[1]) {
        const raw = match[1].replace(/\s|\u202f|\./g, "").replace(",", "")
        const value = Number(raw)
        if (Number.isFinite(value)) return value
      }
    }

    for (const pattern of [
      /\"fan_count\"\s*:\s*(\d+)/i,
      /\"followers_count\"\s*:\s*(\d+)/i,
      /\"follow_count\"\s*:\s*(\d+)/i,
      /\"page_fan_count\"\s*:\s*(\d+)/i,
    ]) {
      const match = html.match(pattern)
      if (match?.[1]) {
        const value = Number(match[1])
        if (Number.isFinite(value)) return value
      }
    }
  } catch {
    // Best-effort public fallback only.
  }

  return undefined
}

// ─── Public Facebook post recovery ────────────────────────────────────────────
// Facebook embeds the most recent timeline posts as JSON inside
// <script type="application/json"> blocks, so real posts (content, date, url)
// can be recovered without the Graph API. This is intentionally limited: the
// logged-out page only exposes the latest posts, not the full history.

function unixToIso(seconds: number): string {
  const ms = seconds > 1e12 ? seconds : seconds * 1000
  const date = new Date(ms)
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()
}

function walkJson(node: unknown, visit: (obj: Record<string, any>) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walkJson(item, visit)
    return
  }
  if (!node || typeof node !== "object") return
  visit(node as Record<string, any>)
  for (const value of Object.values(node as Record<string, any>)) walkJson(value, visit)
}

function extractEngagement(node: unknown): { likes: number; comments: number; shares: number } {
  let likes = 0
  let comments = 0
  let shares = 0
  const scan = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const item of n) scan(item)
      return
    }
    if (!n || typeof n !== "object") return
    const obj = n as Record<string, any>
    if (!likes && typeof obj.reaction_count === "number" && obj.reaction_count > 0) likes = obj.reaction_count
    if (!comments && typeof obj.comment_count === "number" && obj.comment_count > 0) comments = obj.comment_count
    if (!shares && typeof obj.share_count === "number" && obj.share_count > 0) shares = obj.share_count
    for (const value of Object.values(obj)) scan(value)
  }
  scan(node)
  return { likes, comments, shares }
}

async function fetchPublicFacebookPosts(slug: string): Promise<FetchedPost[]> {
  if (!slug) return []

  try {
    const res = await fetch(`https://www.facebook.com/${encodeURIComponent(slug)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    if (!res.ok) return []
    const html = await res.text()

    type Story = {
      url: string | null
      postId: string | null
      createdAt: number
      likes: number
      comments: number
      shares: number
    }
    type Message = { text: string; url: string | null; postId: string | null }

    const stories: Story[] = []
    const messages: Message[] = []

    const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g
    let match: RegExpExecArray | null
    while ((match = scriptRe.exec(html)) !== null) {
      const body = match[1]
      if (!body.includes("creation_time")) continue
      let data: unknown
      try {
        data = JSON.parse(body)
      } catch {
        continue
      }

      walkJson(data, (obj) => {
        const url =
          typeof obj.permalink_url === "string"
            ? obj.permalink_url
            : typeof obj.url === "string"
              ? obj.url
              : null
        const postId = typeof obj.post_id === "string" ? obj.post_id : null

        if (typeof obj.creation_time === "number" && url) {
          const engagement = extractEngagement(obj)
          stories.push({
            url,
            postId,
            createdAt: obj.creation_time,
            likes: engagement.likes,
            comments: engagement.comments,
            shares: engagement.shares,
          })
        }

        const msg = obj.message
        if (msg && typeof msg === "object" && typeof msg.text === "string" && msg.text.trim()) {
          messages.push({ text: msg.text, url, postId })
        }
      })
    }

    const byUrl = new Map<string, Story>()
    for (const story of stories) {
      if (!story.url) continue
      const existing = byUrl.get(story.url)
      if (!existing) {
        byUrl.set(story.url, story)
        continue
      }
      // Some references carry post_id, others only the permalink url. Merge so
      // the same post is never stored twice with two different ids.
      existing.postId = existing.postId ?? story.postId
      existing.likes = existing.likes || story.likes
      existing.comments = existing.comments || story.comments
      existing.shares = existing.shares || story.shares
    }

    const byPostId = new Map<string, Story>()
    for (const story of byUrl.values()) {
      if (story.postId && !byPostId.has(story.postId)) byPostId.set(story.postId, story)
    }

    const seen = new Set<string>()
    const posts: FetchedPost[] = []
    for (const message of messages) {
      const story =
        byUrl.get(message.url ?? "") ??
        (message.postId ? byPostId.get(message.postId) : undefined)
      if (!story) continue
      const key = story.postId ?? story.url ?? message.text
      if (seen.has(key)) continue
      seen.add(key)
      posts.push({
        providerPostId: key,
        content: message.text,
        mediaUrl: null,
        postUrl: story.url,
        publishedAt: unixToIso(story.createdAt),
        likes: story.likes,
        comments: story.comments,
        shares: story.shares,
        views: 0,
        impressions: 0,
      })
    }

    return posts
  } catch {
    return []
  }
}

function facebookSlug(row: CompetitorPlatformRow): string {
  const fromHandle = usernameFromHandle(row.handle)
  if (fromHandle) return fromHandle

  if (row.profile_url) {
    try {
      return usernameFromHandle(new URL(row.profile_url).pathname)
    } catch {
      return ""
    }
  }

  return ""
}

/** Public follower lookup used as a display fallback when the provider API is unavailable. */
export async function fetchPublicFollowerCount(
  platform: string,
  handle: string | null,
  profileUrl: string | null,
): Promise<number | undefined> {
  if (platform !== "facebook") return undefined
  const slug = facebookSlug({ id: "", platform, handle, profile_url: profileUrl })
  if (!slug) return undefined
  return fetchPublicFacebookInfo(slug)
}

async function fetchFacebookPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const slug = facebookSlug(row)

  const publicFallback = async (note: string): Promise<FetchedPage> => {
    const [publicFollowers, publicPosts] = await Promise.all([
      fetchPublicFacebookInfo(slug),
      fetchPublicFacebookPosts(slug),
    ])
    return { followers: publicFollowers, posts: publicPosts, note }
  }

  if (!cred?.token) {
    return publicFallback(
      "Données publiques Facebook récupérées sans token OAuth — publications limitées aux plus récentes.",
    )
  }

  try {
    const auth = { headers: { Authorization: `Bearer ${cred.token}` } }
    let pageId = extractFacebookPageId(row.profile_url)
    let followers: number | undefined

    if (!pageId) {
      const q = usernameFromHandle(row.handle)
      if (!q) return publicFallback("Nom ou URL Facebook manquant.")
      const search = await fetchJson(
        `https://graph.facebook.com/v19.0/search?type=page&q=${encodeURIComponent(q)}&fields=id,name,fan_count&limit=1`,
        auth,
      )
      const page = search?.data?.[0]
      if (!page) {
        return publicFallback("Page Facebook trouvée via fallback public, mais pas via l’API Graph.")
      }
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
      `https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=100`,
      auth,
    )
    const posts: FetchedPost[] = (feed?.data ?? []).map((p: any) => ({
      providerPostId: p.id,
      content: p.message ?? "",
      mediaUrl: p.full_picture ?? null,
      postUrl: p.permalink_url ?? null,
      publishedAt: p.created_time ?? new Date().toISOString(),
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
      views: 0,
      impressions: 0,
    }))

    if (posts.length > 0) return { followers, posts }

    // Graph answered but returned no posts — the token can read the page
    // audience but not a competitor feed. Complete with public scraping.
    const publicPosts = await fetchPublicFacebookPosts(slug)
    const publicFollowers =
      typeof followers === "number" && followers > 0
        ? followers
        : await fetchPublicFacebookInfo(slug)
    return {
      followers: publicFollowers,
      posts: publicPosts,
      note:
        publicPosts.length > 0
          ? "Fil complet indisponible (Page Public Content Access requis) — publications récentes lues sur la page publique."
          : "Aucune publication récupérée (token sans accès au fil concurrent).",
    }
  } catch (graphError) {
    // The Graph API frequently rejects public-page lookups (400/403). Never lose
    // the whole sync for that: fall back to the public page data instead.
    const message = (graphError as Error).message
    const [publicFollowers, publicPosts] = await Promise.all([
      fetchPublicFacebookInfo(slug),
      fetchPublicFacebookPosts(slug),
    ])
    return {
      followers: publicFollowers,
      posts: publicPosts,
      note:
        publicPosts.length > 0
          ? `API Graph indisponible (${message}) — publications récentes lues sur la page publique.`
          : publicFollowers
            ? `API Graph indisponible (${message}) — abonnés lus sur la page publique.`
            : `API Graph indisponible (${message}).`,
    }
  }
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
  const fields = `business_discovery.username(${username}){followers_count,media_count,media.limit(50){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}}`
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
    postUrl: m.permalink ?? null,
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
    const id = p.id ?? ""
    return {
      providerPostId: id,
      content: share?.shareCommentary?.text ?? "",
      mediaUrl: media?.originalUrl ?? null,
      postUrl: p.permalinkUrl ?? `https://www.linkedin.com/feed/update/${id}`,
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

  // Upsert real posts, deduplicated by provider post id. Some live databases
  // predate the `post_url` column — drop any unknown column and retry so the
  // sync never silently loses posts on a schema drift.
  for (const post of page.posts) {
    const payload: Record<string, unknown> = {
      platform_id: row.id,
      provider_post_id: post.providerPostId,
      content: post.content,
      media_url: post.mediaUrl ?? null,
      post_url: post.postUrl ?? null,
      published_at: post.publishedAt,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      views: post.views,
      engagement_rate: postEngagementRate(post),
      synced_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("competitor_posts")
      .upsert(payload, { onConflict: "platform_id,provider_post_id" })

    if (error) {
      const missing = error.message.match(/Could not find the '([^']+)' column/)
      if (missing?.[1]) {
        delete payload[missing[1]]
        await supabase
          .from("competitor_posts")
          .upsert(payload, { onConflict: "platform_id,provider_post_id" })
      }
    }
  }

  const months = aggregatePostsByMonth(page.posts)
  const currentMonth = new Date().toISOString().slice(0, 7)

  if (typeof page.followers === "number" && page.followers > 0) {
    const currentMonthEntry = months.find((entry) => entry.month === currentMonth)
    if (!currentMonthEntry) {
      months.push({
        month: currentMonth,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        posts: 0,
        engagementRate: 0,
      })
    }
  }

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
        followers: agg.month === currentMonth && typeof page.followers === "number" ? page.followers : 0,
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
