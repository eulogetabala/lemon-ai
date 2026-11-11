export type PostMetric = {
  publishedAt: string
  likes: number
  comments: number
  shares: number
  views: number
  impressions: number
}

export type MonthAggregate = {
  month: string // "YYYY-MM"
  impressions: number
  likes: number
  comments: number
  shares: number
  posts: number
  engagementRate: number
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000
}

export function postEngagementRate(post: { likes: number; comments: number; shares: number; views: number }) {
  if (post.views <= 0) return 0
  return round4(((post.likes + post.comments + post.shares) / post.views) * 100)
}

/**
 * Groups real fetched posts into monthly snapshots. Everything here derives from
 * actual provider data — no fabricated numbers.
 */
export function aggregatePostsByMonth(posts: PostMetric[], followers?: number): MonthAggregate[] {
  const byMonth = new Map<
    string,
    { impressions: number; likes: number; comments: number; shares: number; posts: number }
  >()

  for (const post of posts) {
    const month = post.publishedAt.slice(0, 7)
    const current = byMonth.get(month) ?? { impressions: 0, likes: 0, comments: 0, shares: 0, posts: 0 }
    current.impressions += post.impressions
    current.likes += post.likes
    current.comments += post.comments
    current.shares += post.shares
    current.posts += 1
    byMonth.set(month, current)
  }

  return [...byMonth.entries()]
    .map(([month, agg]) => {
      const totalInteractions = agg.likes + agg.comments + agg.shares
      let engagementRate = 0
      if (agg.impressions > 0) {
        engagementRate = round4((totalInteractions / agg.impressions) * 100)
      } else if (followers && followers > 0 && agg.posts > 0) {
        // Average engagement per post, relative to the audience size.
        engagementRate = round4((totalInteractions / agg.posts / followers) * 100)
      }
      return { month, ...agg, engagementRate }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Extracts a clean username / vanity slug from any social profile URL or raw handle.
 * Handles subpaths like /company/slug/home/, query params, leading @, etc.
 */
export function usernameFromHandle(handle?: string | null): string {
  const value = (handle ?? "").trim()
  if (!value) return ""

  // 1. LinkedIn specific: /company/slug, /school/slug, /showcase/slug, /in/slug
  const liMatch = value.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|school|showcase|in)\/([a-zA-Z0-9-_]+)/i)
  if (liMatch?.[1]) return liMatch[1]

  // 2. Facebook: /pages/.../123 or /slug
  const fbMatch = value.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:pages\/[^/]+\/)?([a-zA-Z0-9-._]+)/i)
  if (fbMatch?.[1] && !["pages", "photo.php", "watch", "events", "groups"].includes(fbMatch[1])) {
    return fbMatch[1]
  }

  // 3. Instagram / X / Twitter / TikTok / Threads / YouTube
  const urlMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|x\.com|twitter\.com|instagram\.com|tiktok\.com|threads\.net|youtube\.com)\/(?:@)?([^/?#]+)/i)
  if (urlMatch?.[1]) return urlMatch[1].replace(/\/$/, "")

  // 4. Any generic URL with paths: take last segment that isn't a known utility subpath
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value)
      const segments = url.pathname.split("/").filter(Boolean)
      const ignored = new Set(["home", "posts", "about", "videos", "photos", "feed", "company", "school", "showcase", "in"])
      for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i].replace(/^@/, "").replace(/[^a-zA-Z0-9-._]+/g, "")
        if (seg && !ignored.has(seg.toLowerCase())) {
          return seg
        }
      }
    } catch {
      // ignore
    }
  }

  return value.replace(/^@/, "").replace(/^\/+/, "").replace(/\/+$/, "")
}

/**
 * Rebuilds the canonical profile URL for any supported platform from its handle / slug.
 */
export function buildProfileUrl(platform: string, handle?: string | null): string | null {
  const slug = usernameFromHandle(handle)
  if (!slug) return null
  if (/\s/.test(slug)) return null
  switch (platform) {
    case "twitter":
      return `https://x.com/${slug}`
    case "instagram":
      return `https://instagram.com/${slug}`
    case "facebook":
      return `https://www.facebook.com/${slug}`
    case "linkedin":
      return `https://www.linkedin.com/company/${slug}`
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

