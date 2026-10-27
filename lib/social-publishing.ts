export type LinkedInAuthorResolution =
  | { ok: true; urn: string; kind: "person" | "organization" }
  | { ok: false; error: string }

export type PlatformPublishTarget =
  | { ok: true; platform: string; ownerType: "person" | "organization" | "account" | "page" | "business_account" | "channel"; ownerId: string; ownerLabel: string }
  | { ok: false; platform: string; error: string }

export function normalizeLinkedInAccountId(raw?: string | null): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null
  return value
}

export function getLinkedInAccountKindFromUrl(profileUrl?: string | null): "person" | "organization" | null {
  if (!profileUrl) return null
  const url = profileUrl.trim()
  if (/\/company\//i.test(url)) return "organization"
  if (/\/school\//i.test(url)) return "organization"
  if (/\/in\//i.test(url)) return "person"
  return null
}

export function resolveLinkedInAuthorUrn(
  providerAccountId?: string | null,
  profileUrl?: string | null,
  kind?: "person" | "organization" | "auto",
): LinkedInAuthorResolution {
  const normalized = normalizeLinkedInAccountId(providerAccountId)
  const inferredKind = kind === "auto" || kind === undefined
    ? getLinkedInAccountKindFromUrl(profileUrl) ?? (normalized?.startsWith("urn:li:organization:") ? "organization" : "person")
    : kind

  if (normalized?.startsWith("urn:li:person:")) {
    return { ok: true, urn: normalized, kind: "person" }
  }

  if (normalized?.startsWith("urn:li:organization:")) {
    return { ok: true, urn: normalized, kind: "organization" }
  }

  if (normalized) {
    const urn = `urn:li:${inferredKind === "organization" ? "organization" : "person"}:${normalized}`
    return { ok: true, urn, kind: inferredKind === "organization" ? "organization" : "person" }
  }

  if (inferredKind === "organization") {
    return {
      ok: false,
      error: "LinkedIn company page publishing requires a stored organization URN or organization account id.",
    }
  }

  if (profileUrl && /\/company\//i.test(profileUrl)) {
    return {
      ok: false,
      error: "This LinkedIn connection points to a company page. Please use the organization URN for publishing.",
    }
  }

  return {
    ok: false,
    error: "Missing LinkedIn account id. The connection must include a person or organization URN before publishing.",
  }
}

export function getMediaPublishingStrategy(platform: string): { supportsMedia: boolean; maxImages: number } {
  switch (platform.toUpperCase()) {
    case "TWITTER":
      return { supportsMedia: true, maxImages: 4 }
    case "FACEBOOK":
    case "LINKEDIN":
    case "INSTAGRAM":
      return { supportsMedia: true, maxImages: 1 }
    default:
      return { supportsMedia: false, maxImages: 0 }
  }
}

export function validatePlatformPublishingTarget(
  platform: string,
  providerAccountId?: string | null,
  profileUrl?: string | null,
  handle?: string | null,
): PlatformPublishTarget {
  const value = providerAccountId?.trim() || handle?.trim() || null

  switch (platform.toUpperCase()) {
    case "TWITTER":
      if (!value) return { ok: false, platform, error: "X / Twitter needs a valid linked account before publishing." }
      return { ok: true, platform, ownerType: "account", ownerId: value, ownerLabel: "X account" }

    case "LINKEDIN": {
      const result = resolveLinkedInAuthorUrn(providerAccountId, profileUrl, "auto")
      if (!result.ok) return { ok: false, platform, error: result.error }
      return {
        ok: true,
        platform,
        ownerType: result.kind,
        ownerId: result.urn,
        ownerLabel: result.kind === "organization" ? "LinkedIn company page" : "LinkedIn personal profile",
      }
    }

    case "INSTAGRAM":
      if (!value) return { ok: false, platform, error: "Instagram requires a valid business account identifier before publishing." }
      return { ok: true, platform, ownerType: "business_account", ownerId: value, ownerLabel: "Instagram business account" }

    case "FACEBOOK":
      if (!value) return { ok: false, platform, error: "Facebook requires a valid page identifier before publishing." }
      return { ok: true, platform, ownerType: "page", ownerId: value, ownerLabel: "Facebook page" }

    case "THREADS":
      if (!value) return { ok: false, platform, error: "Threads requires a valid account identifier before publishing." }
      return { ok: true, platform, ownerType: "account", ownerId: value, ownerLabel: "Threads profile" }

    case "YOUTUBE":
      if (!value) return { ok: false, platform, error: "YouTube requires a valid channel identifier before publishing." }
      return { ok: true, platform, ownerType: "channel", ownerId: value, ownerLabel: "YouTube channel" }

    case "TIKTOK":
      if (!value) return { ok: false, platform, error: "TikTok requires a valid account identifier before publishing." }
      return { ok: true, platform, ownerType: "account", ownerId: value, ownerLabel: "TikTok account" }

    default:
      return { ok: true, platform, ownerType: "account", ownerId: value ?? "unknown", ownerLabel: "connected account" }
  }
}
