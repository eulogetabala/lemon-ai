import test from "node:test"
import assert from "node:assert/strict"
import {
  FB_PUBLIC_FEED_REQUIREMENT,
  IG_PAGE_REQUIREMENT,
  IG_REQUIRED_SCOPES,
  FB_PUBLIC_NOTE_PREFIX,
  metaScopeAdvice,
  noteIsPublicFallback,
  noteNeedsMetaReconnect,
  shortProviderError,
} from "../lib/competitor-sync-notes.ts"

test("metaScopeAdvice names every missing scope and asks for a reconnection", () => {
  const advice = metaScopeAdvice(["instagram_manage_insights"])
  assert.match(advice, /instagram_manage_insights/)
  assert.match(advice, /App Review/)
  assert.match(advice, /reconnectez Facebook/)
})

test("metaScopeAdvice lists several missing scopes", () => {
  const advice = metaScopeAdvice(["instagram_basic", "pages_read_engagement"])
  assert.match(advice, /instagram_basic/)
  assert.match(advice, /pages_read_engagement/)
})

test("metaScopeAdvice never asks for a reconnection when no scope is missing", () => {
  const advice = metaScopeAdvice([])
  assert.doesNotMatch(advice, /reconnectez Facebook/i)
  assert.match(advice, /déjà accordées/)
  assert.match(advice, /App Review/)
})

test("noteNeedsMetaReconnect flags actionable notes only", () => {
  assert.equal(noteNeedsMetaReconnect(null), false)
  assert.equal(noteNeedsMetaReconnect("Aucune publication sur la période"), false)
  assert.equal(noteNeedsMetaReconnect(`Profil inaccessible.${metaScopeAdvice(["instagram_manage_insights"])}`), true)
  assert.equal(noteNeedsMetaReconnect(`Aucun compte trouvé. ${IG_PAGE_REQUIREMENT}`), true)
})

test("noteNeedsMetaReconnect does not loop when scopes are all granted", () => {
  const note = `Business Discovery indisponible pour « bch_congo » (réponse sans business_discovery).${metaScopeAdvice([])}`
  assert.equal(noteNeedsMetaReconnect(note), false)
})

test("IG_REQUIRED_SCOPES covers the Business Discovery prerequisites", () => {
  assert.deepEqual([...IG_REQUIRED_SCOPES], [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_read_engagement",
  ])
})

test("shortProviderError keeps the Meta code and drops the essay", () => {
  const raw =
    "Provider API 400: (#10) This endpoint requires the 'pages_read_engagement' permission or the 'Page Public Content Access' feature or the 'Page Public Metadata Access' feature. Refer to https://developers.facebook.com/docs/apps/review/login-permissions#manage-pages for details."
  const short = shortProviderError(raw)
  assert.match(short, /#10/)
  assert.match(short, /pages_read_engagement/)
  assert.doesNotMatch(short, /https:\/\//)
  assert.ok(short.length <= 161, `expected <=161 chars, got ${short.length}`)
})

test("shortProviderError survives missing or blank messages", () => {
  assert.equal(shortProviderError(null), "cause inconnue")
  assert.equal(shortProviderError("   "), "cause inconnue")
})

test("Facebook feed note explains the missing feature without offering a reconnection", () => {
  const note = `API Graph indisponible (${shortProviderError("Provider API 400: (#10) nope.")}). ${FB_PUBLIC_FEED_REQUIREMENT} Publications limitées aux plus récentes.`
  assert.match(note, /Page Public Content Access/)
  assert.match(note, /pages_read_engagement/)
  assert.equal(noteNeedsMetaReconnect(note), false)
})

test("noteIsPublicFallback recognises every public-page note", () => {
  assert.equal(
    noteIsPublicFallback(
      `${FB_PUBLIC_NOTE_PREFIX} — l'API officielle ne couvre pas les Pages concurrentes sans Page Public Content Access.`,
    ),
    true,
  )
  assert.equal(
    noteIsPublicFallback(`${FB_PUBLIC_NOTE_PREFIX} récupérées sans token OAuth — publications limitées.`),
    true,
  )
  assert.equal(
    noteIsPublicFallback(
      `${FB_PUBLIC_NOTE_PREFIX} — le fil complet exige la fonctionnalité Page Public Content Access.`,
    ),
    true,
  )
})

test("noteIsPublicFallback ignores real failures and empty notes", () => {
  assert.equal(noteIsPublicFallback(null), false)
  assert.equal(noteIsPublicFallback(""), false)
  assert.equal(
    noteIsPublicFallback(
      "API Graph indisponible ((#10) requires pages_read_engagement). " + FB_PUBLIC_FEED_REQUIREMENT,
    ),
    false,
  )
  assert.equal(
    noteIsPublicFallback(
      "Authentification Meta incomplète — autorisations absentes du token Meta : instagram_manage_insights",
    ),
    false,
  )
})
