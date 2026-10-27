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
}

export interface CompetitorPost {
  id: string
  platform: CompetitorPlatformKey
  content: string
  mediaUrl?: string | null
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
