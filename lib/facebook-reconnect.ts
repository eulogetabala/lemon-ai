/**
 * Browser-side helper to restart the Facebook OAuth flow from anywhere in the
 * app. Meta scopes are baked into the access token at exchange time, so a
 * channel connected before a scope was granted keeps failing until it goes
 * through a fresh OAuth round-trip.
 */

const FACEBOOK_CHANNEL_TYPE = "FACEBOOK"

/** Resolve the `channel_types` id of Facebook from the connected channels list. */
export async function findFacebookChannelTypeId(): Promise<string | null> {
  const res = await fetch("/api/channel")
  if (!res.ok) return null
  const data = await res.json()
  const channels: Array<{ id?: string | null; type?: string | null }> = Array.isArray(data?.channels)
    ? data.channels
    : []
  const facebook = channels.find(
    (channel) => String(channel?.type ?? "").toUpperCase() === FACEBOOK_CHANNEL_TYPE,
  )
  return facebook?.id ? String(facebook.id) : null
}

/**
 * Redirect the user to Facebook's consent screen and come back to `returnTo`.
 * The blank tab is opened synchronously (before the first `await`) because
 * browsers only allow a popup from a direct user gesture.
 */
export function startFacebookReconnect({
  returnTo,
  onError,
}: {
  returnTo: string
  onError?: (message: string) => void
}): void {
  const target = window.open("", "_blank")

  void (async () => {
    const fail = (message: string) => {
      if (target && !target.closed) target.close()
      onError?.(message)
    }

    try {
      const channelTypeId = await findFacebookChannelTypeId()
      if (!channelTypeId) {
        fail("Canal Facebook introuvable. Connectez Facebook depuis les paramètres.")
        return
      }

      const res = await fetch("/api/channel/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelTypeId, returnTo }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) {
        fail(data?.error || "Échec du démarrage de la connexion Facebook")
        return
      }

      if (target && !target.closed) {
        target.location.href = data.url
      } else {
        // Popup blocked: stay in the current tab.
        window.location.href = data.url
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : "Échec du démarrage de la connexion Facebook")
    }
  })()
}
