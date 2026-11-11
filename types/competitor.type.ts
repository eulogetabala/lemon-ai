export type CompetitorPlatformKey =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "threads"
  | "tiktok"
  | "youtube"

export interface CompetitorPlatform {
  id?: string
  platform: CompetitorPlatformKey
  handle: string
  profileUrl?: string | null
  profileImage?: string | null
  providerAccountId?: string | null
  followers: number
  connectedAt: string
  syncedAt?: string | null
  lastError?: string | null
}

export interface Competitor {
  id: string
  name: string
  industry: string
  website?: string | null
  verified: boolean
  connectedAt: string
  platforms: CompetitorPlatform[]
}

export interface CompetitorStat {
  platform: CompetitorPlatformKey
  month: string // "YYYY-MM"
  impressions: number
  likes: number
  comments: number
  shares: number
  posts: number
  followers: number
  engagementRate: number
  /** Follower count at the end of the month (live count for the current month). */
  followersEnd?: number
  /** Followers gained during the month; null when no baseline exists yet. */
  newFollowers?: number | null
  /** What newFollowers is measured against. */
  followersBasis?: "prev_month" | "tracking_start" | null
}

export interface CompetitorPost {
  id: string
  platform: CompetitorPlatformKey
  content: string
  mediaUrl?: string | null
  postUrl?: string | null
  publishedAt: string
  likes: number
  comments: number
  shares: number
  views: number
  engagementRate: number
}

export interface CompetitorTotals {
  followers: number
  posts: number
  impressions: number
  engagement: number
  change: number // % impressions vs previous month
}

export type CompetitorListItem = Competitor & {
  totals: CompetitorTotals
}

export type CompetitorDetail = {
  competitor: Competitor
  availableMonths: string[]
  month: string
  stats: CompetitorStat[]
  prevStats: CompetitorStat[]
  posts: CompetitorPost[]
  allStats: CompetitorStat[]
  allPosts: CompetitorPost[]
}

export type CreateCompetitorInput = {
  name: string
  industry?: string
  website?: string
  platforms: {
    platform: CompetitorPlatformKey
    handle?: string
    profileUrl?: string
  }[]
}
