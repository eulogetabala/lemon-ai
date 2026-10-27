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
export function aggregatePostsByMonth(posts: PostMetric[]): MonthAggregate[] {
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
      const engagementRate = agg.impressions > 0
        ? round4(((agg.likes + agg.comments + agg.shares) / agg.impressions) * 100)
        : 0
      return { month, ...agg, engagementRate }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}
