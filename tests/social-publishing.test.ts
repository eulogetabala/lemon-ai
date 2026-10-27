import test from "node:test"
import assert from "node:assert/strict"

import { ChannelTypeEnum } from "../constants/channels"
import { buildChannelProfileUrl } from "../lib/channel-urls"
import { normalizeSocialPostText } from "../lib/rich-text"
import { getLinkedInAccountKindFromUrl, getMediaPublishingStrategy, resolveLinkedInAuthorUrn, validatePlatformPublishingTarget } from "../lib/social-publishing"

test("resolves a personal LinkedIn account as a person URN", () => {
  const result = resolveLinkedInAuthorUrn("123456789", null)
  assert.equal(result.ok, true)
  assert.equal(result.urn, "urn:li:person:123456789")
})

test("detects LinkedIn person and company profile URLs", () => {
  assert.equal(getLinkedInAccountKindFromUrl("https://www.linkedin.com/in/euloge-tabala"), "person")
  assert.equal(getLinkedInAccountKindFromUrl("https://www.linkedin.com/company/acme"), "organization")
})

test("does not build a public profile link from a display name with spaces", () => {
  assert.equal(buildChannelProfileUrl(ChannelTypeEnum.LINKEDIN, "Euloge TABALA MABANDZA"), null)
  assert.equal(buildChannelProfileUrl(ChannelTypeEnum.LINKEDIN, "euloge-tabala", null), "https://www.linkedin.com/in/euloge-tabala")
})

test("keeps an existing organization URN unchanged", () => {
  const result = resolveLinkedInAuthorUrn("urn:li:organization:987654321", null)
  assert.equal(result.ok, true)
  assert.equal(result.urn, "urn:li:organization:987654321")
})

test("rejects company-page publishing when the account id is not an organization URN", () => {
  const result = resolveLinkedInAuthorUrn(null, "https://linkedin.com/company/acme")
  assert.equal(result.ok, false)
  assert.match(result.error ?? "", /organization/i)
})

test("approves a valid Twitter target and rejects a missing platform account", () => {
  const valid = validatePlatformPublishingTarget("TWITTER", "abc123", null, "@brand")
  assert.equal(valid.ok, true)
  assert.equal(valid.ownerType, "account")

  const invalid = validatePlatformPublishingTarget("TWITTER", null, null, null)
  assert.equal(invalid.ok, false)
  assert.match(invalid.error ?? "", /needs a valid/i)
})

test("treats Instagram and LinkedIn as single-image media publishers", () => {
  assert.deepEqual(getMediaPublishingStrategy("INSTAGRAM"), { supportsMedia: true, maxImages: 1 })
  assert.deepEqual(getMediaPublishingStrategy("LINKEDIN"), { supportsMedia: true, maxImages: 1 })
  assert.deepEqual(getMediaPublishingStrategy("FACEBOOK"), { supportsMedia: true, maxImages: 1 })
  assert.deepEqual(getMediaPublishingStrategy("TWITTER"), { supportsMedia: true, maxImages: 4 })
})

test("normalizes HTML-rich social content into plain text before publishing", () => {
  const raw = '<div><strong>L’IA change les règles du jeu.</strong></div><div>Deuxième paragraphe.</div><ul><li>Un</li><li>Deux</li></ul>'
  const normalized = normalizeSocialPostText(raw)

  assert.equal(normalized.includes("<"), false)
  assert.match(normalized, /L’IA change les règles du jeu\./)
  assert.match(normalized, /Deuxième paragraphe\./)
  assert.match(normalized, /Un/)
  assert.match(normalized, /Deux/)
})
