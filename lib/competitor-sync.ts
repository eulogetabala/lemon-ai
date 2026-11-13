import type { SupabaseClient } from "@supabase/supabase-js"
import { ChannelTypeEnum } from "@/constants/channels"
import { decrypt, encrypt } from "@/lib/encryption"
import { getOAuthProvider } from "@/lib/social-oauth"
import { getSupabaseAdminClient } from "@/lib/supabase-server"
import {
  aggregatePostsByMonth,
  postEngagementRate,
  usernameFromHandle,
  buildProfileUrl,
} from "@/lib/competitor-stats"
import {
  FB_PUBLIC_FEED_REQUIREMENT,
  FB_PUBLIC_NOTE_PREFIX,
  IG_PAGE_REQUIREMENT,
  IG_REQUIRED_SCOPES,
  metaScopeAdvice,
  shortProviderError,
} from "@/lib/competitor-sync-notes"

export { usernameFromHandle, buildProfileUrl }


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
  profileImage?: string
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

/** `alternates`: other connected tokens worth trying (Instagram: every Meta account). */
type Credential = { token: string; alternates?: string[] } | null

const MEDIA_BUCKET = "lemon"
const STORAGE_MARKER = "/storage/v1/object/public/"

/**
 * Provider CDN image URLs (fbcdn, cdninstagram…) are signed and expire after a
 * few days, which is why post images "disappeared". Copy each image once into
 * our own storage and serve that stable URL instead. On any failure, keep the
 * original URL so nothing is lost.
 */
async function mirrorImage(_supabase: SupabaseClient, sourceUrl: string, keyBase: string): Promise<string | null> {
  if (!sourceUrl) return null
  if (sourceUrl.includes(STORAGE_MARKER)) return sourceUrl
  try {
    // Facebook "lookaside" pictures are only served as images to its crawler UA.
    const response = await fetch(
      sourceUrl,
      sourceUrl.includes("lookaside.fbsbx.com") ? { headers: { "User-Agent": FB_CRAWLER_UA } } : {},
    )
    if (!response.ok) return sourceUrl
    const contentType = response.headers.get("content-type") ?? "image/jpeg"
    // Not an image (e.g. an HTML page): storing it would only show a broken image.
    if (!contentType.startsWith("image/")) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > 8 * 1024 * 1024) return sourceUrl
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
    const key = `${keyBase}.${ext}`
    const storage = getSupabaseAdminClient().storage.from(MEDIA_BUCKET)
    const { error } = await storage.upload(key, bytes, { contentType, upsert: true })
    if (error) return sourceUrl
    return storage.getPublicUrl(key).data.publicUrl
  } catch {
    return sourceUrl
  }
}

function safeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120)
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.error?.error_user_msg ?? body?.error?.message ?? body?.message ?? response.statusText
    throw new Error(`Provider API ${response.status}: ${detail}`)
  }
  return response.json()
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
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
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

/**
 * Key identifying one post across providers. Instagram Graph returns a media id
 * ("1784…") while the public scrape returns another numeric id for the same post,
 * so the permalink shortcode is the only stable identity between the two.
 */
export function postDedupeKey(postId: string, postUrl?: string | null): string {
  const shortcode = postUrl?.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1]
  return shortcode ? `ig:${shortcode}` : postId
}

/**
 * Facebook exposes the same post under a numeric post id and under a base64
 * "story" id ("S:_I<pageId>:<postId>[:…]"). Reduce both to the post id so a
 * post is stored once.
 */
export function normalizeFacebookPostId(id: string): string {
  if (!id || /^\d+$/.test(id)) return id
  try {
    const decoded = Buffer.from(id, "base64").toString("utf8")
    const match = decoded.match(/^S:_I\d+:(\d+)/)
    if (match) return match[1]
  } catch {
    // not base64
  }
  return id
}

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

    // 1. Reactions / Likes
    const rc = obj.reaction_count
    if (typeof rc === "number" && rc > likes) likes = rc
    else if (rc && typeof rc.count === "number" && rc.count > likes) likes = rc.count
    const i18nRc = obj.i18n_reaction_count
    if (typeof i18nRc === "string" && /^\d+$/.test(i18nRc) && Number(i18nRc) > likes) likes = Number(i18nRc)

    // 2. Shares
    const sc = obj.share_count
    if (typeof sc === "number" && sc > shares) shares = sc
    else if (sc && typeof sc.count === "number" && sc.count > shares) shares = sc.count
    const i18nSc = obj.i18n_share_count
    if (typeof i18nSc === "string" && /^\d+$/.test(i18nSc) && Number(i18nSc) > shares) shares = Number(i18nSc)

    // 3. Comments
    const comm = obj.comments
    if (comm && typeof comm.total_count === "number" && comm.total_count > comments) comments = comm.total_count
    const commRend = obj.comments_count_summary_renderer
    if (commRend && commRend.feedback && typeof commRend.feedback.total_count === "number" && commRend.feedback.total_count > comments) {
      comments = commRend.feedback.total_count
    }

    for (const value of Object.values(obj)) scan(value)
  }
  scan(node)
  return { likes, comments, shares }
}

const FB_CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"

/** Facebook picture URL usable as a source (CDN, or crawler lookaside that we mirror). */
function isFacebookImageUrl(u: unknown): u is string {
  return typeof u === "string" && /^https:\/\/[^/]*(fbcdn\.net|lookaside\.fbsbx\.com)\//.test(u)
}

/**
 * The picture of a public Facebook story. Only the story's own attachments are
 * read: walking the whole node used to pick up page avatars or commenters'
 * pictures, or nothing at all (photos are exposed as lookaside crawler URLs).
 */
function extractStoryImage(story: Record<string, any>): string {
  const attachments: any[] = [
    ...(Array.isArray(story.attachments) ? story.attachments : []),
    ...(Array.isArray(story.comet_sections?.content?.story?.attachments)
      ? story.comet_sections.content.story.attachments
      : []),
  ]
  for (const att of attachments) {
    const holder = att?.styles?.attachment ?? att
    const medias = [
      holder?.media,
      ...(holder?.all_subattachments?.nodes ?? []).map((n: any) => n?.media),
      ...(holder?.subattachments ?? []).map((n: any) => n?.media),
    ]
    for (const media of medias) {
      if (!media) continue
      const candidates = [
        media.photo_image?.uri, // photo post
        media.preferred_thumbnail?.image?.uri, // video poster (CDN)
        media.thumbnailImage?.uri, // video poster (lookaside)
        media.image?.uri,
        media.viewer_image?.uri,
        media.large_share_image?.uri, // link preview
      ]
      const found = candidates.find(isFacebookImageUrl)
      if (found) return found
    }
  }
  return ""
}

async function fetchPublicFacebookPosts(slug: string): Promise<FetchedPost[]> {
  if (!slug) return []
  try {
    const res = await fetch(`https://www.facebook.com/${encodeURIComponent(slug)}`, {
      headers: {
        "User-Agent": FB_CRAWLER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    if (!res.ok) return []
    return parseFacebookTimelineHtml(await res.text(), slug)
  } catch {
    // Best effort main page scrape
    return []
  }
}

/** Extracts the posts embedded in a public Facebook page's HTML. Exported for tests. */
export function parseFacebookTimelineHtml(html: string, slug: string): FetchedPost[] {
  const posts: FetchedPost[] = []
  const seen = new Set<string>()
  {
    {
      const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g
      let match: RegExpExecArray | null

      while ((match = scriptRe.exec(html)) !== null) {
        const body = match[1]
        if (!body.includes("timeline_list_feed_units") && !body.includes("creation_time") && !body.includes("post_id")) continue
        let data: unknown
        try {
          data = JSON.parse(body)
        } catch {
          continue
        }

        const extractStoryNode = (node: Record<string, any>) => {
          let pId = (node.post_id || node.id || "") ? String(node.post_id || node.id) : ""
          let cTime = node.creation_time || node.publish_time

          let text = ""
          let url = ""
          const mediaUrl = extractStoryImage(node)
          let likes = 0
          let comments = 0
          let shares = 0

          const walkSub = (s: unknown) => {
            if (Array.isArray(s)) {
              for (const it of s) walkSub(it)
              return
            }
            if (!s || typeof s !== "object") return
            const o = s as Record<string, any>

            if (!pId && o.post_id) pId = String(o.post_id)
            if (!cTime && (o.creation_time || o.publish_time)) cTime = o.creation_time || o.publish_time

            if (!text) {
              const m = o.message
              if (m && typeof m === "object" && typeof m.text === "string" && m.text.trim()) {
                text = m.text
              } else if (typeof m === "string" && m.trim()) {
                text = m
              }
            }

            if (!url) {
              const u = o.url || o.permalink_url
              if (typeof u === "string" && (u.includes("/posts/") || u.includes("/photos/") || u.includes("/videos/"))) {
                url = u
              }
            }

            const eng = extractEngagement(o)
            if (eng.likes > likes) likes = eng.likes
            if (eng.comments > comments) comments = eng.comments
            if (eng.shares > shares) shares = eng.shares

            for (const v of Object.values(o)) walkSub(v)
          }

          walkSub(node)

          pId = normalizeFacebookPostId(pId)
          if (pId && (text || url)) {
            if (!seen.has(pId)) {
              seen.add(pId)
              const pubAt = cTime && typeof cTime === "number" ? unixToIso(cTime) : new Date().toISOString()
              const fullPostUrl = url
                ? (url.startsWith("http") ? url : `https://www.facebook.com${url}`)
                : `https://www.facebook.com/${slug}`

              posts.push({
                providerPostId: pId,
                content: text || "Publication officielle",
                mediaUrl: mediaUrl || null,
                postUrl: fullPostUrl,
                publishedAt: pubAt,
                likes,
                comments,
                shares,
                views: 0,
                impressions: 0,
              })
            }
          }
        }

        const scanTree = (obj: unknown) => {
          if (Array.isArray(obj)) {
            for (const it of obj) scanTree(it)
            return
          }
          if (!obj || typeof obj !== "object") return
          const o = obj as Record<string, any>

          if (o.timeline_list_feed_units && Array.isArray(o.timeline_list_feed_units.edges)) {
            for (const edge of o.timeline_list_feed_units.edges) {
              if (edge?.node) extractStoryNode(edge.node)
            }
          }

          if (o.post_id && (o.creation_time || o.publish_time)) {
            extractStoryNode(o)
          }

          for (const v of Object.values(o)) scanTree(v)
        }

        scanTree(data)
      }
    }
  }

  return posts
}

function facebookSlug(row: CompetitorPlatformRow): string {
  const fromHandle = usernameFromHandle(row.handle)
  if (fromHandle) return fromHandle.replace(/^\/+/, "")

  if (row.profile_url) {
    const fromProfile = usernameFromHandle(row.profile_url)
    if (fromProfile) return fromProfile.replace(/^\/+/, "")
    try {
      return usernameFromHandle(new URL(row.profile_url).pathname).replace(/^\/+/, "")
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
  const slug = usernameFromHandle(handle) || usernameFromHandle(profileUrl)
  if (!slug) return undefined
  if (platform === "facebook") return fetchPublicFacebookInfo(slug)
  if (platform === "instagram") {
    const page = await fetchPublicInstagramPage(slug)
    return page.followers
  }
  if (platform === "linkedin") {
    const page = await fetchPublicLinkedinCompany(slug)
    return page.followers
  }
  return undefined
}

const IG_WEB_APP_ID = "936619743392459"
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

function parseCountLoose(raw: string): number | undefined {
  const cleaned = raw
    .replace(/\u202f|\u00a0|\s/g, "")
    .replace(/,/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KkMmBb])?$/)
  if (!match) {
    const digits = Number(cleaned.replace(/[^\d]/g, ""))
    return Number.isFinite(digits) && digits > 0 ? digits : undefined
  }
  const base = Number(match[1])
  if (!Number.isFinite(base)) return undefined
  const suffix = (match[2] || "").toLowerCase()
  const mult = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1
  return Math.round(base * mult)
}

/** Public Instagram profile via HTML (crawler UA) then optional web_profile_info. */
export async function fetchPublicInstagramPage(username: string): Promise<FetchedPage> {
  if (!username) return { posts: [], note: "Identifiant Instagram manquant." }

  // Prefer the Facebook crawler UA: logged-out Instagram pages expose og:meta + Relay media JSON.
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: {
        "User-Agent": FB_CRAWLER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    if (res.ok) {
      const page = parseInstagramPublicHtml(await res.text(), username)
      if (page.posts.length > 0 || page.followers) return page
    }
  } catch {
    // try web API below
  }

  try {
    const apiRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json",
          "X-IG-App-ID": IG_WEB_APP_ID,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `https://www.instagram.com/${encodeURIComponent(username)}/`,
        },
        redirect: "follow",
      },
    )
    if (apiRes.ok) {
      const body = await apiRes.json().catch(() => null)
      const user = body?.data?.user
      if (user) {
        const posts: FetchedPost[] = (user.edge_owner_to_timeline_media?.edges ?? [])
          .map((edge: any) => edge?.node)
          .filter(Boolean)
          .map((node: any) => {
            const caption =
              node.edge_media_to_caption?.edges?.[0]?.node?.text ??
              node.accessibility_caption ??
              ""
            const shortcode = node.shortcode ?? node.code ?? node.id
            return {
              providerPostId: String(node.id ?? shortcode),
              content: caption,
              mediaUrl:
                node.is_video
                  ? node.thumbnail_src ?? node.display_url ?? null
                  : node.display_url ?? node.thumbnail_src ?? null,
              postUrl: shortcode ? `https://www.instagram.com/p/${shortcode}/` : null,
              publishedAt: node.taken_at_timestamp
                ? unixToIso(node.taken_at_timestamp)
                : new Date().toISOString(),
              likes: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
              comments: node.edge_media_to_comment?.count ?? 0,
              shares: 0,
              views: node.video_view_count ?? 0,
              impressions: 0,
            } satisfies FetchedPost
          })
        return {
          followers: user.edge_followed_by?.count ?? user.follower_count,
          profileImage: user.profile_pic_url_hd ?? user.profile_pic_url,
          posts,
          note:
            posts.length > 0
              ? "Profil Instagram lu via l’API web publique (publications récentes)."
              : "Profil Instagram trouvé, aucune publication récente exposée publiquement.",
        }
      }
    }
  } catch {
    // fall through
  }

  return {
    posts: [],
    note: `Aucune donnée publique exploitable pour @${username}.`,
  }
}

const INSTAGRAM_ID_EPOCH_MS = BigInt("1314220021721")

/**
 * Instagram media ids embed their creation time: the bits above the low 23 are
 * milliseconds since Instagram's epoch. Used when the payload has no taken_at.
 */
export function instagramMediaIdToIso(mediaId: string): string | null {
  const raw = String(mediaId).split("_")[0]
  if (!/^\d{15,}$/.test(raw)) return null
  const ms = Number((BigInt(raw) >> BigInt(23)) + INSTAGRAM_ID_EPOCH_MS)
  // Sanity window: after Instagram's launch, not in the future.
  if (!Number.isFinite(ms) || ms < Date.UTC(2010, 0, 1) || ms > Date.now() + 86_400_000) return null
  return new Date(ms).toISOString()
}

/** Extracts followers / recent posts from a public Instagram profile HTML page. */
export function parseInstagramPublicHtml(html: string, username: string): FetchedPage {
  let followers: number | undefined
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1] ??
    ""
  const desc = decodeHtmlEntities(ogDesc)
  const followerMatch = desc.match(
    /([0-9][0-9\s.,\u202f]*[KkMmBb]?)\s*(?:Followers|abonnés|followers)/i,
  )
  if (followerMatch?.[1]) followers = parseCountLoose(followerMatch[1])

  for (const pattern of [
    /"follower_count"\s*:\s*(\d+)/i,
    /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
  ]) {
    const m = html.match(pattern)
    if (m?.[1]) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > 0) {
        followers = n
        break
      }
    }
  }

  const profileImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]

  const posts: FetchedPost[] = []
  const seen = new Set<string>()

  // Current Instagram SSR embeds media nodes inside Relay JSON scripts.
  const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch: RegExpExecArray | null
  while ((scriptMatch = scriptRe.exec(html)) !== null) {
    const body = scriptMatch[1]
    if (!body.includes("__isXIGPolarisMedia") && !body.includes("seo_canonical_url") && !body.includes("image_versions2")) {
      continue
    }
    let data: unknown
    try {
      data = JSON.parse(body)
    } catch {
      continue
    }
    walkJson(data, (node) => {
      const isMedia =
        node.__isXIGPolarisMedia === true ||
        (typeof node.pk === "string" &&
          /^\d{10,}$/.test(node.pk) &&
          (node.image_versions2 || node.seo_canonical_url || node.caption))
      if (!isMedia) return

      const mediaId = String(node.id ?? node.pk ?? "").replace(/^POLARIS_/, "")
      if (!mediaId || seen.has(mediaId)) return
      // Skip tiny unrelated pk values (user ids, etc.)
      if (!/^\d{10,}$/.test(mediaId) && !String(node.id || "").startsWith("POLARIS_")) return

      const captionText =
        typeof node.caption?.text === "string"
          ? decodeJsonString(node.caption.text)
          : typeof node.caption === "string"
            ? node.caption
            : ""
      const candidates: string[] = []
      const versions = node.image_versions2?.candidates
      if (Array.isArray(versions)) {
        for (const c of versions) if (typeof c?.url === "string") candidates.push(c.url)
      }
      if (typeof node.thumbnail_url === "string") candidates.push(node.thumbnail_url)
      if (typeof node.display_uri === "string") candidates.push(node.display_uri)

      const canonical =
        typeof node.seo_canonical_url === "string"
          ? node.seo_canonical_url
          : typeof node.code === "string" && node.code.length > 5
            ? `https://www.instagram.com/p/${node.code}/`
            : `https://www.instagram.com/${username}/`

      seen.add(mediaId)
      posts.push({
        providerPostId: mediaId,
        content: captionText,
        mediaUrl: candidates[0] ?? null,
        postUrl: canonical,
        publishedAt: node.taken_at
          ? unixToIso(Number(node.taken_at))
          : node.taken_at_timestamp
            ? unixToIso(Number(node.taken_at_timestamp))
            : instagramMediaIdToIso(mediaId) ?? new Date().toISOString(),
        likes: Number(node.like_count ?? node.likes ?? 0) || 0,
        comments: Number(node.comment_count ?? node.comments ?? 0) || 0,
        shares: 0,
        views: Number(node.view_count ?? node.play_count ?? 0) || 0,
        impressions: 0,
      })
    })
  }

  // Legacy shortcode fallback if Relay nodes were absent.
  if (posts.length === 0) {
    const shortcodeRe = /"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/g
    let match: RegExpExecArray | null
    while ((match = shortcodeRe.exec(html)) !== null && posts.length < 24) {
      const code = match[1]
      if (seen.has(code)) continue
      seen.add(code)
      posts.push({
        providerPostId: code,
        content: "",
        mediaUrl: null,
        postUrl: `https://www.instagram.com/p/${code}/`,
        publishedAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        impressions: 0,
      })
    }
  }

  return {
    followers,
    profileImage: profileImage || undefined,
    posts: posts.slice(0, 50),
    note:
      posts.length > 0 || followers
        ? "Données Instagram publiques — publications limitées aux plus récentes."
        : `Aucune donnée publique exploitable pour @${username}.`,
  }
}

function toLinkedInOrganizationUrn(id: string): string {
  const value = String(id || "").trim()
  if (!value) return ""
  if (value.startsWith("urn:li:organization:")) return value
  if (value.startsWith("urn:li:")) return value
  return `urn:li:organization:${value}`
}

function parseLinkedInFollowerElements(elements: any[]): number {
  let max = 0
  for (const el of elements ?? []) {
    const fc = el?.followerCounts
    if (fc && typeof fc === "object" && !Array.isArray(fc)) {
      const organic = Number(fc.organicFollowerCount ?? 0)
      const paid = Number(fc.paidFollowerCount ?? 0)
      const total = Number(fc.totalFollowerCount ?? organic + paid)
      if (Number.isFinite(total) && total > max) max = total
    }
    for (const bag of [el?.followerCountsByRegion, el?.followerCountsByCountry, el?.followerCountsByStaffCountRange]) {
      if (!Array.isArray(bag)) continue
      for (const row of bag) {
        const counts = row?.followerCounts
        if (counts && typeof counts === "object" && !Array.isArray(counts)) {
          const organic = Number(counts.organicFollowerCount ?? 0)
          const paid = Number(counts.paidFollowerCount ?? 0)
          const total = organic + paid
          if (total > max) max = total
        } else if (Array.isArray(counts)) {
          for (const c of counts) {
            const n = Number(c?.count ?? 0)
            if (n > max) max = n
          }
        }
      }
    }
  }
  return max
}

/** Public LinkedIn company page scrape (followers + recent activity when exposed). */
export async function fetchPublicLinkedinCompany(slug: string): Promise<FetchedPage> {
  if (!slug) return { posts: [], note: "Identifiant de page LinkedIn manquant." }

  // LinkedIn blocks generic browser UAs from many server IPs (403 Cloudflare).
  // The Facebook crawler UA reliably returns the public company page HTML.
  const userAgents = [FB_CRAWLER_UA, BROWSER_UA]
  let lastStatus = 0
  for (const ua of userAgents) {
    try {
      const res = await fetch(`https://www.linkedin.com/company/${encodeURIComponent(slug)}/`, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      })
      lastStatus = res.status
      if (!res.ok) continue
      const page = parseLinkedinCompanyHtml(await res.text(), slug)
      if (page.posts.length > 0 || page.followers) return page
    } catch {
      // try next UA
    }
  }

  return {
    posts: [],
    note: `Page LinkedIn « ${slug} » inaccessible publiquement${lastStatus ? ` (${lastStatus})` : ""}.`,
  }
}

/** Extracts followers / posts from a public LinkedIn company HTML page. */
export function parseLinkedinCompanyHtml(html: string, slug: string): FetchedPage {
  let followers: number | undefined
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1] ??
    ""
  const desc = decodeHtmlEntities(ogDesc)
  const followerMatch =
    desc.match(/([0-9][0-9\s.,\u202f]*[KkMmBb]?)\s*(?:followers|abonnés|followers on LinkedIn)/i) ||
    html.match(/([0-9][0-9\s.,\u202f]*[KkMmBb]?)\s*(?:followers|abonnés)/i)
  if (followerMatch?.[1]) followers = parseCountLoose(followerMatch[1])

  const followerCountMatch = html.match(/"followerCount"\s*:\s*(\d+)/i)
  if (followerCountMatch?.[1]) {
    const n = Number(followerCountMatch[1])
    if (Number.isFinite(n) && n > 0) followers = n
  }

  const profileImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]

  const posts: FetchedPost[] = []
  const seen = new Set<string>()

  // Current public markup: one <article data-activity-urn="urn:li:activity:…"> per update,
  // with the text in [data-test-id="main-feed-activity-card__commentary"], the age in a
  // <time> element and the engagement as "1 764 réactions" / "164 commentaires" labels.
  const cards = [...html.matchAll(/<article[^>]*data-activity-urn="urn:li:activity:(\d+)"/g)]
  for (const card of cards) {
    if (posts.length >= 20) break
    const id = card[1]
    if (seen.has(id)) continue
    seen.add(id)
    const start = card.index ?? 0
    const articleEnd = html.indexOf("</article>", start)
    const segment = html.slice(start, articleEnd > start ? articleEnd : Math.min(html.length, start + 30000))

    const content = decodeHtmlEntities(
      stripLinkedinMarkup(
        segment.match(/data-test-id="main-feed-activity-card__commentary"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "",
      ),
    )
    // i18n templates ("%numReactions% Reactions") would otherwise be read as real counts.
    const countable = segment.replace(/<code[\s\S]*?<\/code>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
    const stat = (re: RegExp) => parseCountLoose(countable.match(re)?.[1] ?? "") ?? 0
    // Video posts have no <img>: the still frame is exposed as data-poster-url on the <video>.
    const posterUrl =
      [...segment.matchAll(/data-poster-url="([^"]+)"/gi)]
        .map((m) => decodeHtmlEntities(m[1]))
        .find((url) => /^https:\/\/media\.licdn\.com\//.test(url)) ?? null
    const mediaUrl =
      [...segment.matchAll(/data-delayed-url="(https:\/\/media\.licdn\.com\/[^"]+)"/gi)]
        .map((m) => decodeHtmlEntities(m[1]))
        .find((url) => !/company-logo|\/profile-displ|aero-v1|\/embeds\//.test(url)) ?? posterUrl
    // The permalink sits before the <article> and may belong to a neighbouring card, so only
    // accept a link pointing at this card's own activity id.
    const permalink = html
      .slice(Math.max(0, start - 4000), start + segment.length)
      .match(new RegExp(`href="(https://www\\.linkedin\\.com/(?:posts|pulse)/[^"]*activity-${id}[^"]*)"`, "i"))?.[1]

    posts.push({
      providerPostId: `li-activity-${id}`,
      content,
      mediaUrl,
      postUrl:
        decodeHtmlEntities(permalink ?? "") || `https://www.linkedin.com/feed/update/urn:li:activity:${id}`,
      publishedAt: linkedinActivityDate(id) ?? linkedinPostDate(segment) ?? new Date().toISOString(),
      likes: stat(/\b([\d][\d.,\u202f\s]*)\s*(?:reactions?|réactions?)\b/i),
      comments: stat(/\b([\d][\d.,\u202f\s]*)\s*(?:comments?|commentaires?)\b/i),
      shares: stat(/\b([\d][\d.,\u202f\s]*)\s*(?:reposts?|republications?)\b/i),
      views: 0,
      impressions: 0,
    })
  }

  // Older markup only embeds activity URNs (sometimes with a JSON payload): keep it as a fallback.
  // Share and ugcPost URNs are ignored: they designate the same update as its activity URN with a
  // slightly different id, which used to create duplicate rows the next sync never overwrote.
  if (posts.length === 0) {
    const activityRe = /urn:li:activity:(\d+)/g
    let act: RegExpExecArray | null
    while ((act = activityRe.exec(html)) !== null && posts.length < 20) {
      const id = act[1]
      if (seen.has(id)) continue
      seen.add(id)
      const around = html.slice(Math.max(0, act.index - 500), act.index + 800)
      const text =
        around.match(/"commentary"\s*:\s*\{[^}]*"text"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ??
        around.match(/"text"\s*:\s*"((?:\\.|[^"\\]){20,400})"/)?.[1] ??
        ""
      const content = decodeJsonString(text)
      const likes = Number(around.match(/"numLikes"\s*:\s*(\d+)/)?.[1] ?? 0)
      const comments = Number(around.match(/"numComments"\s*:\s*(\d+)/)?.[1] ?? 0)
      const shares = Number(around.match(/"numShares"\s*:\s*(\d+)/)?.[1] ?? 0)
      // Nothing to show (no text, no engagement): the old code stored a blank placeholder row.
      if (!content && likes + comments + shares === 0) continue
      posts.push({
        providerPostId: `li-activity-${id}`,
        content,
        mediaUrl: null,
        postUrl: `https://www.linkedin.com/feed/update/urn:li:activity:${id}`,
        publishedAt: linkedinActivityDate(id) ?? new Date().toISOString(),
        likes,
        comments,
        shares,
        views: 0,
        impressions: 0,
      })
    }
  }

  return {
    followers,
    profileImage: profileImage || undefined,
    posts,
    note:
      posts.length > 0 || followers
        ? "Données LinkedIn publiques — l’API officielle ne couvre pas les pages concurrentes."
        : `Aucune donnée publique exploitable pour la page LinkedIn « ${slug} ».`,
  }
}

/**
 * LinkedIn activity ids are snowflakes: the creation time in ms is the id shifted right by 22 bits.
 * The shift runs on BigInt because these ids exceed Number.MAX_SAFE_INTEGER.
 */
function linkedinActivityDate(id: string): string | null {
  if (!/^\d+$/.test(id)) return null
  const ms = Number(BigInt(id) / BigInt(2 ** 22))
  if (!Number.isFinite(ms) || ms < Date.UTC(2010, 0, 1) || ms > Date.now() + 86_400_000) return null
  return new Date(ms).toISOString()
}

/** Post commentary HTML → plain text (links keep their label, line breaks are preserved). */
function stripLinkedinMarkup(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t\u202f\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** LinkedIn only exposes a relative age ("1d", "3 sem."): convert it to an absolute date. */
function linkedinPostDate(segment: string): string | null {
  const raw = segment.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ?? ""
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const rel = text.match(/(\d+)\s*(min|sem|mois|ans?|mo|m|h|d|j|w|y)\b/i)
  if (!rel) return null
  const amount = Number(rel[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unit = rel[2].toLowerCase()
  const minutes =
    unit === "min" || unit === "m"
      ? amount
      : unit === "h"
        ? amount * 60
        : unit === "d" || unit === "j"
          ? amount * 1440
          : unit === "w" || unit === "sem"
            ? amount * 10080
            : unit === "mo" || unit === "mois"
              ? amount * 43200
              : amount * 525600
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#xA0;|&#160;|&#x202f;|&#8239;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function decodeJsonString(value: string): string {
  if (!value) return ""
  try {
    return JSON.parse(`"${value}"`)
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
  }
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
      `${FB_PUBLIC_NOTE_PREFIX} récupérées sans token OAuth — publications limitées aux plus récentes.`,
    )
  }

  try {
    const auth = { headers: { Authorization: `Bearer ${cred.token}` } }
    // A page can be addressed by numeric id or by its vanity name.
    const pageRef = extractFacebookPageId(row.profile_url) || slug
    if (!pageRef) return publicFallback("Nom ou URL Facebook manquant.")

    const page = await fetchJson(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pageRef)}?fields=id,name,fan_count,followers_count,picture.type(large){url}`,
      auth,
    )
    const pageId: string = page.id
    const followers: number | undefined = page.followers_count ?? page.fan_count
    const profileImage: string | undefined = page.picture?.data?.url

    // Every post since the 1st of the previous month (so a competitor added
    // mid-month shows its whole month, plus last month for comparison),
    // following Graph pagination.
    const since = Math.floor(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1) / 1000)
    const rawPosts: any[] = []
    let next: string | null =
      `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,attachments{media,subattachments.limit(1){media}},permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)&since=${since}&limit=100`
    for (let pageCount = 0; next && pageCount < 10; pageCount++) {
      const feed = await fetchJson(next, auth)
      rawPosts.push(...(feed?.data ?? []))
      next = feed?.paging?.next ?? null
    }
    const posts: FetchedPost[] = rawPosts.map((p: any) => ({
      providerPostId: p.id,
      content: p.message ?? "",
      mediaUrl:
        p.full_picture ??
        p.attachments?.data?.[0]?.media?.image?.src ??
        p.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src ??
        null,
      postUrl: p.permalink_url ?? null,
      publishedAt: p.created_time ?? new Date().toISOString(),
      likes: p.reactions?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
      views: 0,
      impressions: 0,
    }))

    if (posts.length > 0) return { followers, profileImage, posts }

    // Graph answered but returned no posts — the token can read the page
    // audience but not a competitor feed. Complete with public scraping.
    const publicPosts = await fetchPublicFacebookPosts(slug)
    const publicFollowers =
      typeof followers === "number" && followers > 0
        ? followers
        : await fetchPublicFacebookInfo(slug)
    return {
      followers: publicFollowers,
      profileImage,
      posts: publicPosts,
      note:
        publicPosts.length > 0
          ? `${FB_PUBLIC_NOTE_PREFIX} — le fil complet exige la fonctionnalité Page Public Content Access : publications récentes lues sur la page publique.`
          : "Aucune publication récupérée (token sans accès au fil concurrent).",
    }
  } catch (graphError) {
    // The Graph API frequently rejects public-page lookups (400/403). Never lose
    // the whole sync for that: fall back to the public page data instead.
    const message = shortProviderError((graphError as Error).message)
    const [publicFollowers, publicPosts] = await Promise.all([
      fetchPublicFacebookInfo(slug),
      fetchPublicFacebookPosts(slug),
    ])
    // (#10) on a Page we do not manage is Meta's permanent "Page Public Content Access"
    // gate, not a fault: say it plainly instead of showing the raw API error.
    const permanentGate = /\(#10\)|Public Content Access|Public Metadata Access/i.test(message)
    if (permanentGate) console.warn("[facebook] fil concurrent non accessible via Graph", message)
    const reason = permanentGate
      ? `${FB_PUBLIC_NOTE_PREFIX} — l'API officielle ne couvre pas les Pages concurrentes sans Page Public Content Access.`
      : `API Graph indisponible (${message}). ${FB_PUBLIC_FEED_REQUIREMENT}`
    return {
      followers: publicFollowers,
      posts: publicPosts,
      note:
        publicPosts.length > 0
          ? `${reason} Publications limitées aux plus récentes.`
          : publicFollowers
            ? `${reason} Seuls les abonnés ont pu être lus.`
            : reason,
    }
  }
}

/**
 * Why Instagram engagement is out of reach. Meta only exposes like/comment counts
 * through Business Discovery, which requires the caller to be an Instagram
 * Business/Creator account linked to a Facebook Page and to hold {@link IG_REQUIRED_SCOPES}
 * — the Instagram Login product alone cannot do it.
 */
const IG_DISCOVERY_REQUIREMENT = IG_PAGE_REQUIREMENT

/**
 * Which of {@link IG_REQUIRED_SCOPES} the token never received. A token can be
 * perfectly valid yet lack one scope, and Meta then answers with the unhelpful
 * "(#10) Application does not have permission for this action" — so name them.
 */
async function missingMetaScopes(token: string): Promise<string[]> {
  const appId = process.env.FACEBOOK_CLIENT_ID
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET
  if (!token || !appId || !appSecret) return []
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${appId}|${appSecret}`,
    )
    const body = await r.json().catch(() => null)
    const granted: unknown = body?.data?.scopes
    if (!Array.isArray(granted) || granted.length === 0) return []
    return IG_REQUIRED_SCOPES.filter((scope) => !granted.includes(scope))
  } catch {
    return []
  }
}

async function fetchInstagramPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const username = usernameFromHandle(row.handle) || usernameFromHandle(row.profile_url)
  if (!username) return { posts: [], note: "Identifiant Instagram manquant." }

  const publicFallback = async (apiNote?: string): Promise<FetchedPage> => {
    const pub = await fetchPublicInstagramPage(username)
    if (pub.posts.length > 0 || pub.followers) {
      return {
        ...pub,
        note: apiNote
          ? `${apiNote} — ${pub.note ?? "données publiques utilisées."}`
          : pub.note,
      }
    }
    return {
      posts: [],
      note:
        apiNote ||
        pub.note ||
        "Aucune donnée Instagram récupérée. Connectez Facebook avec un Instagram Business lié, ou vérifiez le @ concurrent.",
    }
  }

  if (!cred?.token) {
    return publicFallback(
      "Pas de token Meta — lecture du profil Instagram public.",
    )
  }

  // Business Discovery must be called AS an Instagram Business account. Connected
  // tokens come in several shapes (Facebook user token, Facebook Page token,
  // Instagram Login token), and the most recent Facebook channel is not always
  // the Page linked to Instagram: try every connected Meta token.
  const fields = `business_discovery.username(${username}){followers_count,media_count,profile_picture_url,media.limit(50){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}}`
  const tokens = [...new Set([cred.token, ...(cred.alternates ?? [])])]
  let discovery: any = null
  let lastError = ""
  let foundBusinessAccount = false
  const resolveErrors: string[] = []
  // The token that actually reaches Business Discovery: an alternate credential
  // can carry different scopes than the preferred one, so probe this one only.
  let probedToken = tokens[0] ?? ""
  for (const token of tokens) {
    const account = await resolveInstagramBusinessAccount(token, resolveErrors)
    if (!account) continue
    foundBusinessAccount = true
    const authToken = account.token || token
    probedToken = authToken
    try {
      discovery = await fetchJson(
        `https://${account.host}/${account.id}?fields=${encodeURIComponent(fields)}`,
        { headers: { Authorization: `Bearer ${authToken}` } },
      )
      if (discovery?.business_discovery) break
      lastError = "réponse sans business_discovery"
      discovery = null
    } catch (err) {
      lastError = (err as Error).message
    }
  }

  // Only probe the token when discovery actually failed: the answer is what turns
  // a cryptic "(#10)" into an actionable diagnosis (missing scope vs. Page/app).
  let scopeHint: Promise<string> | null = null
  const describeMissingScopes = () => {
    scopeHint ??= missingMetaScopes(probedToken).then(metaScopeAdvice)
    return scopeHint
  }

  if (!foundBusinessAccount) {
    console.warn("[instagram] aucun compte compatible Business Discovery", [...new Set(resolveErrors)].slice(0, 3))
    return publicFallback(`${IG_DISCOVERY_REQUIREMENT}${await describeMissingScopes()}`)
  }
  if (!discovery?.business_discovery) {
    const hint = await describeMissingScopes()
    return publicFallback(
      `Business Discovery indisponible pour « ${username} » (${lastError || "compte non professionnel"}).${hint}`,
    )
  }

  const bd = discovery.business_discovery
  const posts: FetchedPost[] = (bd.media?.data ?? []).map((m: any) => ({
    providerPostId: m.id,
    content: m.caption ?? "",
    mediaUrl:
      // A VIDEO's media_url is the mp4 itself: show its thumbnail instead.
      m.media_type === "VIDEO" ? m.thumbnail_url ?? null : m.media_url ?? m.thumbnail_url ?? null,
    postUrl: m.permalink ?? null,
    publishedAt: m.timestamp ?? new Date().toISOString(),
    likes: m.like_count ?? 0,
    comments: m.comments_count ?? 0,
    shares: 0,
    views: 0,
    impressions: 0,
  }))

  if (posts.length === 0 && !bd.followers_count) {
    return publicFallback("Business Discovery a renvoyé un profil vide")
  }

  return { followers: bd.followers_count, profileImage: bd.profile_picture_url, posts }
}

/** Instagram Business account usable for Business Discovery with this token, if any. */
async function resolveInstagramBusinessAccount(
  token: string,
  errors: string[] = [],
): Promise<{ id: string; host: string; token?: string } | null> {
  const get = async (url: string, authToken = token) => {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } })
      const body = await r.json().catch(() => null)
      if (r.ok) return body
      const host = new URL(url).host
      errors.push(`${host}: ${body?.error?.message ?? r.status}`)
      return null
    } catch (err) {
      errors.push((err as Error).message)
      return null
    }
  }
  const fb = "graph.facebook.com/v19.0"
  // Facebook Page token: /me is the Page.
  const page = await get(`https://${fb}/me?fields=instagram_business_account,access_token`)
  if (page?.instagram_business_account?.id) {
    return {
      id: page.instagram_business_account.id,
      host: fb,
      token: page.access_token || token,
    }
  }
  // Facebook user token: look through the Pages they manage — prefer the Page access token.
  const accounts = await get(
    `https://${fb}/me/accounts?fields=id,name,access_token,instagram_business_account&limit=100`,
  )
  const linkedPage = accounts?.data?.find((p: any) => p?.instagram_business_account?.id)
  if (linkedPage?.instagram_business_account?.id) {
    return {
      id: linkedPage.instagram_business_account.id,
      host: fb,
      token: linkedPage.access_token || token,
    }
  }
  // Instagram Login token (graph.instagram.com): /me answers, but that host has no
  // business_discovery field. Treating it as a usable anchor only produced the
  // misleading "Tried accessing nonexisting field (business_discovery)" error, so
  // stop here and let the caller explain the real prerequisite.
  const ig = "graph.instagram.com/v21.0"
  const me = await get(`https://${ig}/me?fields=user_id,account_type`, token)
  if (me?.user_id || me?.id) errors.push(IG_DISCOVERY_REQUIREMENT)
  return null
}

async function fetchLinkedinPage(row: CompetitorPlatformRow, cred: Credential): Promise<FetchedPage> {
  const slug = usernameFromHandle(row.handle) || usernameFromHandle(row.profile_url)
  if (!slug) return { posts: [], note: "Identifiant de page LinkedIn manquant." }

  let apiNote = ""
  if (cred?.token) {
    try {
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
      const rawId = org?.elements?.[0]?.id
      const orgUrn = toLinkedInOrganizationUrn(String(rawId ?? ""))
      if (orgUrn) {
        const encodedUrn = encodeURIComponent(orgUrn)

        // 2. Follower statistics (owned pages only — competitor orgs usually 403).
        let followers = 0
        try {
          const followersData = await fetchJson(
            `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`,
            auth,
          )
          followers = parseLinkedInFollowerElements(followersData?.elements ?? [])
        } catch (err) {
          apiNote = (err as Error).message
        }

        // 3. Posts published by the organization (owned pages).
        let posts: FetchedPost[] = []
        try {
          const postsData = await fetchJson(
            `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodedUrn})&count=50&sortBy=LAST_MODIFIED`,
            auth,
          )
          posts = (postsData?.elements ?? []).map((p: any) => {
            const share = p.specificContent?.["com.linkedin.ugc.ShareContent"]
            const media = share?.media?.[0]
            const id = String(p.id ?? "")
            return {
              providerPostId: id,
              content: share?.shareCommentary?.text ?? "",
              mediaUrl: media?.originalUrl ?? null,
              postUrl: p.permalinkUrl ?? `https://www.linkedin.com/feed/update/${id}`,
              publishedAt: p.created?.time
                ? new Date(p.created.time).toISOString()
                : new Date().toISOString(),
              likes: 0,
              comments: 0,
              shares: 0,
              views: 0,
              impressions: 0,
            } satisfies FetchedPost
          })
        } catch (err) {
          apiNote = apiNote || (err as Error).message
        }

        if (posts.length > 0 || followers > 0) {
          return { followers: followers || undefined, posts }
        }
      } else {
        apiNote = "organisation LinkedIn introuvable via vanityName"
      }
    } catch (err) {
      apiNote = (err as Error).message
    }
  } else {
    apiNote = "Aucun compte LinkedIn connecté"
  }

  // Official Marketing API only covers pages you administer. For competitors,
  // fall back to the public company page (followers + activity when exposed).
  const pub = await fetchPublicLinkedinCompany(slug)
  if (pub.posts.length > 0 || pub.followers) {
    return {
      ...pub,
      note: apiNote
        ? `API LinkedIn limitée (${apiNote}) — ${pub.note}`
        : pub.note,
    }
  }

  return {
    posts: [],
    note: apiNote
      ? `LinkedIn : aucune donnée API ni publique (${apiNote}). Vérifiez le slug /company/… et reconnectez LinkedIn avec r_organization_social si c’est votre propre page.`
      : "LinkedIn : aucune donnée récupérée pour cette page concurrente.",
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
  if (platform === "instagram") return getMetaCredentials(supabase, userId)
  const credentialPlatform = platform

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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

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

/** Every connected Facebook and Instagram token of the user (Instagram Business Discovery). */
async function getMetaCredentials(supabase: SupabaseClient, userId: string): Promise<Credential> {
  const { data: types } = await supabase.from("channel_types").select("id, type").in("type", ["instagram", "facebook"])
  const typeIds = (types ?? []).map((t: any) => t.id)
  if (typeIds.length === 0) return null
  const typeOf = (id: string) => (types ?? []).find((t: any) => t.id === id)?.type as string | undefined
  // Business Discovery only exists on graph.facebook.com, so a Facebook credential
  // (user or Page token) is the only one that can anchor it. Try those first and
  // keep the Instagram Login token as a last resort.
  const order = (id: string) => (typeOf(id) === "facebook" ? 0 : 1)
  const { data: channels } = await supabase
    .from("user_channels")
    .select("id, channel_type_id, access_token, refresh_token, token_expires_at, created_at")
    .eq("user_id", userId)
    .in("channel_type_id", typeIds)
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
  const sorted = (channels ?? []).sort((a: any, b: any) => order(a.channel_type_id) - order(b.channel_type_id))
  const tokens: string[] = []
  for (const c of sorted as any[]) {
    let token = c.access_token ? decrypt(c.access_token) : null
    const expiresAt = c.token_expires_at ? new Date(c.token_expires_at).getTime() : 0
    // Instagram long-lived tokens last 60 days: extend them a week before expiry.
    if (token && typeOf(c.channel_type_id) === "instagram" && expiresAt && Date.now() > expiresAt - 7 * 86_400_000) {
      const refreshToken = c.refresh_token ? decrypt(c.refresh_token) : null
      const provider = getOAuthProvider(ChannelTypeEnum.INSTAGRAM)
      if (refreshToken && provider && Date.now() < expiresAt) {
        try {
          const refreshed = await provider.refreshToken({ refreshToken })
          await supabase
            .from("user_channels")
            .update({
              access_token: encrypt(refreshed.accessToken),
              refresh_token: encrypt(refreshed.refreshToken ?? refreshed.accessToken),
              token_expires_at: refreshed.expiresAt,
            })
            .eq("id", c.id)
          token = refreshed.accessToken
        } catch (err) {
          console.warn("[instagram] token refresh failed", (err as Error).message)
        }
      }
    }
    if (token) tokens.push(token)
  }
  if (tokens.length === 0) return null
  return { token: tokens[0], alternates: tokens.slice(1) }
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

  // Store real followers and canonical profile info
  const canonicalSlug = usernameFromHandle(row.handle) || usernameFromHandle(row.profile_url)
  const canonicalUrl = buildProfileUrl(row.platform, canonicalSlug)

  await supabase
    .from("competitor_platforms")
    .update({
      handle: canonicalSlug || row.handle,
      profile_url: canonicalUrl || row.profile_url,
      followers: typeof page.followers === "number" ? page.followers : undefined,
      ...(page.profileImage
        ? { profile_image: (await mirrorImage(supabase, page.profileImage, `competitors/${row.id}/avatar`)) ?? undefined }
        : {}),
      synced_at: new Date().toISOString(),
      last_error: page.note ?? null,
    })
    .eq("id", row.id)

  // Images already copied to our storage are reused instead of re-downloaded.
  let { data: storedPosts, error: storedError } = (await supabase
    .from("competitor_posts")
    .select("id, provider_post_id, content, media_url, post_url, likes, comments")
    .eq("platform_id", row.id)) as { data: any[] | null; error: { message: string } | null }
  // Database without the post_url column (migration 20261103 not applied).
  if (storedError) {
    storedPosts = (
      await supabase
        .from("competitor_posts")
        .select("id, provider_post_id, content, media_url, likes, comments")
        .eq("platform_id", row.id)
    ).data as any[] | null
  }

  // One post may be stored twice under different provider ids (Graph vs public scrape).
  // Keep the row with the most engagement and delete the others.
  const keeperByKey = new Map<string, any>()
  const duplicateIds: string[] = []
  for (const p of storedPosts ?? []) {
    const key = postDedupeKey(String(p.provider_post_id), p.post_url)
    const kept = keeperByKey.get(key)
    if (!kept) {
      keeperByKey.set(key, p)
      continue
    }
    const score = (x: any) => (x.likes ?? 0) + (x.comments ?? 0)
    if (score(p) > score(kept)) {
      duplicateIds.push(kept.id)
      keeperByKey.set(key, p)
    } else {
      duplicateIds.push(p.id)
    }
  }
  if (duplicateIds.length > 0) {
    const { error: dupError } = await supabase.from("competitor_posts").delete().in("id", duplicateIds)
    if (dupError) console.error("[competitor_posts dedupe error]", dupError.message)
    storedPosts = (storedPosts ?? []).filter((p: any) => !duplicateIds.includes(p.id))
  }
  const storedMedia = new Map<string, string>(
    (storedPosts ?? [])
      .filter((p: any) => typeof p.media_url === "string" && p.media_url.includes(STORAGE_MARKER))
      .map((p: any) => [String(p.provider_post_id), p.media_url as string]),
  )
  // Any image already known for a post (even a provider URL), kept when a later
  // sync — e.g. the public scrape after a Graph sync — does not see it again.
  const knownMedia = new Map<string, string>(
    (storedPosts ?? [])
      .filter((p: any) => typeof p.media_url === "string" && p.media_url)
      .map((p: any) => [String(p.provider_post_id), p.media_url as string]),
  )

  // Upsert real posts, deduplicated by provider post id.
  for (const fetched of page.posts) {
    // Reuse the stored row's id when the same post was saved under another provider id.
    const keeper = keeperByKey.get(postDedupeKey(fetched.providerPostId, fetched.postUrl))
    const post = keeper
      ? {
          ...fetched,
          providerPostId: String(keeper.provider_post_id),
          // A public scrape that cannot see engagement must not erase Graph counts.
          likes: Math.max(fetched.likes, keeper.likes ?? 0),
          comments: Math.max(fetched.comments, keeper.comments ?? 0),
        }
      : fetched
    const mirrored = post.mediaUrl
      ? storedMedia.get(post.providerPostId) ??
        (await mirrorImage(supabase, post.mediaUrl, `competitors/${row.id}/${safeKey(post.providerPostId)}`))
      : null
    const mediaUrl = mirrored ?? knownMedia.get(post.providerPostId) ?? null
    const payload: Record<string, unknown> = {
      platform_id: row.id,
      provider_post_id: post.providerPostId,
      content: post.content,
      media_url: mediaUrl,
      post_url: post.postUrl ?? null,
      published_at: post.publishedAt,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      views: post.views,
      engagement_rate: postEngagementRate(post),
      synced_at: new Date().toISOString(),
    }

    let { error } = await supabase
      .from("competitor_posts")
      .upsert(payload, { onConflict: "platform_id,provider_post_id" })

    // Database without the post_url column (migration 20261103 not applied).
    if (error && /post_url/.test(error.message)) {
      delete payload.post_url
      ;({ error } = await supabase
        .from("competitor_posts")
        .upsert(payload, { onConflict: "platform_id,provider_post_id" }))
    }

    if (error) {
      console.error("[competitor_posts upsert error]", error.message)
    }
  }

  // The former LinkedIn parser stored a blank "Publication LinkedIn" row per update, keyed on the
  // share URN while the current one keys on the activity URN: those rows are never overwritten and
  // are displayed as empty posts. Drop the ones the fresh sync does not know about.
  const freshPostIds = new Set(page.posts.map((post) => post.providerPostId))
  const stalePlaceholderIds = (storedPosts ?? [])
    .filter((p: any) => String(p.content ?? "") === "Publication LinkedIn" && !freshPostIds.has(String(p.provider_post_id)))
    .map((p: any) => p.id)
  if (page.posts.length > 0 && stalePlaceholderIds.length > 0) {
    const { error: cleanupError } = await supabase
      .from("competitor_posts")
      .delete()
      .in("id", stalePlaceholderIds)
    if (cleanupError) console.error("[competitor_posts cleanup error]", cleanupError.message)
  }

  const followersCount = typeof page.followers === "number" ? page.followers : undefined
  const months = aggregatePostsByMonth(page.posts, followersCount)
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

  const liveFollowers = typeof page.followers === "number" && page.followers > 0 ? page.followers : null

  // Was there already a snapshot for the current month? If not, this is the
  // first sync of the month: its follower count is the month's baseline, used
  // to compute "nouveaux abonnés du mois".
  const { data: currentRow } = await supabase
    .from("competitor_stats")
    .select("id")
    .eq("platform_id", row.id)
    .eq("month", currentMonth)
    .maybeSingle()

  for (const agg of months) {
    const payload: Record<string, unknown> = {
      platform_id: row.id,
      month: agg.month,
      impressions: agg.impressions,
      likes: agg.likes,
      comments: agg.comments,
      shares: agg.shares,
      posts: agg.posts,
      engagement_rate: agg.engagementRate,
      synced_at: new Date().toISOString(),
    }
    // Only the current month gets the live follower count. Past months keep
    // the last value recorded during that month (never overwritten with 0).
    if (agg.month === currentMonth && liveFollowers !== null) {
      payload.followers = liveFollowers
      if (!currentRow) payload.followers_start = liveFollowers
    }

    let { error } = await supabase
      .from("competitor_stats")
      .upsert(payload, { onConflict: "platform_id,month" })

    // Database without the followers_start column yet: retry without it.
    if (error && "followers_start" in payload && /followers_start/.test(error.message)) {
      delete payload.followers_start
      ;({ error } = await supabase.from("competitor_stats").upsert(payload, { onConflict: "platform_id,month" }))
    }
    if (error) console.error("[competitor_stats upsert error]", error.message)
  }

  return {
    ok: true,
    note: page.note,
    months: months.map((m) => m.month),
    postsCount: page.posts.length,
  }
}
