/**
 * Shared wording for competitor sync notes.
 *
 * Notes end up verbatim in `competitor_platforms.last_error` and are rendered
 * as-is by the competitor page, so the UI also needs a way to recognise the
 * ones whose fix is a Facebook reconnection rather than another resync.
 * Keeping the text here means the server and the client cannot drift apart.
 */

/** Facebook Login scopes Instagram Business Discovery cannot work without. */
export const IG_REQUIRED_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_read_engagement",
] as const

/**
 * Meta only exposes Instagram like/comment counts through Business Discovery,
 * which requires an Instagram Business/Creator account linked to a Facebook
 * Page — the Instagram Login product alone cannot do it.
 */
export const IG_PAGE_REQUIREMENT =
  "Meta ne fournit les statistiques Instagram qu'à un compte Business/Créateur relié à une Page Facebook : reconnectez Facebook en cochant cette Page (droits instagram_basic, instagram_manage_insights, pages_read_engagement, business_management), puis resynchronisez."

/**
 * Why the token alone is not enough. `missing` comes from `debug_token`: when it
 * is empty the granted scopes are fine, so pointing at a reconnection would loop
 * the user forever — send them to the two remaining causes instead.
 */
export function metaScopeAdvice(missing: readonly string[]): string {
  if (missing.length > 0) {
    return ` Autorisations absentes du token Meta : ${missing.join(", ")} — demandez-les sur l'app Meta (App Review) puis reconnectez Facebook.`
  }
  return " Toutes les autorisations Meta requises sont déjà accordées au token : le blocage vient de la Page reliée à Instagram (compte Business/Créateur requis) ou de l'accès avancé à instagram_manage_insights sur l'app Meta (App Review), pas d'une reconnexion."
}

/**
 * Why a competitor's Facebook feed is out of reach. `pages_read_engagement`
 * only unlocks Pages the user *manages*; reading someone else's Page needs the
 * `Page Public Content Access` feature, which Meta grants through App Review and
 * refuses to most analytics apps — so the public scrape is the normal outcome.
 */
export const FB_PUBLIC_FEED_REQUIREMENT =
  "Lire le fil d'une Page que vous ne gérez pas exige la fonctionnalité Page Public Content Access (accès avancé, App Review) en plus de pages_read_engagement — la reconnexion n'y change rien, les publications récentes sont donc lues sur la page publique."

/**
 * Meta never opens a competitor Page's feed without `Page Public Content Access`,
 * so "public page only" is the normal outcome for Facebook competitors, not a
 * failure. Every such note starts with this lead so the UI can render it as
 * information instead of an incomplete-source warning.
 */
export const FB_PUBLIC_NOTE_PREFIX = "Données Facebook publiques"

/** True when the note only says "we read the public page" — nothing to repair. */
export function noteIsPublicFallback(note?: string | null): boolean {
  if (!note) return false
  return note.trimStart().startsWith(FB_PUBLIC_NOTE_PREFIX)
}

/** Graph errors arrive as multi-paragraph essays; keep the code and first sentence. */
export function shortProviderError(message: string | null | undefined, max = 160): string {
  if (!message) return "cause inconnue"
  const cleaned = message.replace(/^Provider API \d+:\s*/, "").replace(/\s+/g, " ").trim()
  const firstSentence = cleaned.split(". ")[0] ?? cleaned
  const text = firstSentence.length > max ? `${firstSentence.slice(0, max).trimEnd()}…` : firstSentence
  return text || "cause inconnue"
}

/** Strings that mark a note as "needs a Facebook/Instagram reconnection". */
// Only the two actionable sentences qualify: a note that merely mentions
// "business_discovery" is *not* fixed by reconnecting (that is the whole point
// of `metaScopeAdvice([])`), so matching those words would loop the user.
const META_RECONNECT_SIGNALS = [
  "autorisations absentes du token meta",
  "reconnectez facebook en cochant cette page",
]

/** True when the note describes a Meta permission/Page problem, not a plain empty period. */
export function noteNeedsMetaReconnect(note?: string | null): boolean {
  if (!note) return false
  const normalized = note.toLowerCase()
  return META_RECONNECT_SIGNALS.some((signal) => normalized.includes(signal))
}
