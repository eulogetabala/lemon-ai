import { ChannelTypeEnum, CHANNEL_TYPE_URLS } from "@/constants/channels"

export function getChannelUrl(type: ChannelTypeEnum | string | undefined) {
  if (!type) return ""
  const normalized = String(type).toUpperCase() as ChannelTypeEnum
  return CHANNEL_TYPE_URLS[normalized] ?? ""
}

export function buildChannelProfileUrl(
  type: ChannelTypeEnum | string | undefined,
  handle?: string | null,
  profileUrl?: string | null,
) {
  const normalizedProfileUrl = profileUrl?.trim()
  if (normalizedProfileUrl) return normalizedProfileUrl

  const cleanHandle = (handle ?? "").trim().replace(/^@/, "")
  if (!cleanHandle) return null
  if (/\s/.test(cleanHandle)) return null

  const normalized = String(type ?? "").toUpperCase() as ChannelTypeEnum
  const baseUrl = getChannelUrl(normalized)
  if (!baseUrl) return null

  switch (normalized) {
    case ChannelTypeEnum.LINKEDIN:
      return `https://www.linkedin.com/in/${cleanHandle}`
    case ChannelTypeEnum.TWITTER:
      return `https://x.com/${cleanHandle}`
    case ChannelTypeEnum.INSTAGRAM:
      return `https://instagram.com/${cleanHandle}`
    case ChannelTypeEnum.THREADS:
      return `https://www.threads.net/@${cleanHandle}`
    case ChannelTypeEnum.FACEBOOK:
      return `https://facebook.com/${cleanHandle}`
    case ChannelTypeEnum.YOUTUBE:
      return `https://youtube.com/@${cleanHandle}`
    case ChannelTypeEnum.TIKTOK:
      return `https://www.tiktok.com/@${cleanHandle}`
    case ChannelTypeEnum.BLUESKY:
      return `https://bsky.app/profile/${cleanHandle}`
    default:
      return `${baseUrl}/${cleanHandle}`
  }
}
