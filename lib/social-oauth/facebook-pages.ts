import { encrypt, decrypt } from "@/lib/encryption"

export const FACEBOOK_PAGE_SELECT_COOKIE = "fb_page_select"

export type FacebookPageOption = {
  id: string
  name: string
  pictureUrl: string | null
  accessToken: string
}

export type FacebookPageSelectSession = {
  userId: string
  channelTypeId: string
  userAccessToken: string
  tokenExpiresAt: string | null
}

export async function listFacebookPages(userAccessToken: string): Promise<FacebookPageOption[]> {
  const url =
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture{url}&limit=100&access_token=${encodeURIComponent(userAccessToken)}`

  const response = await fetch(url, { headers: { Accept: "application/json" } })
  const data = await response.json()

  if (!response.ok || data?.error) {
    throw new Error(
      data?.error?.message ||
        `Impossible de lister les pages Facebook (HTTP ${response.status}).`,
    )
  }

  const pages: any[] = Array.isArray(data?.data) ? data.data : []
  return pages
    .filter((p) => p?.id && p?.access_token)
    .map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "Page sans nom"),
      pictureUrl: p?.picture?.data?.url ?? null,
      accessToken: String(p.access_token),
    }))
}

export function encodeFacebookPageSelectSession(session: FacebookPageSelectSession): string {
  return encrypt(JSON.stringify(session))!
}

export function decodeFacebookPageSelectSession(raw: string | undefined | null): FacebookPageSelectSession | null {
  if (!raw) return null
  try {
    const decrypted = decrypt(raw)
    if (!decrypted) return null
    const parsed = JSON.parse(decrypted) as FacebookPageSelectSession
    if (!parsed?.userId || !parsed?.channelTypeId || !parsed?.userAccessToken) return null
    return parsed
  } catch {
    return null
  }
}
