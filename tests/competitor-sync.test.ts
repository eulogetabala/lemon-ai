import test from "node:test"
import assert from "node:assert/strict"
import { usernameFromHandle, buildProfileUrl } from "../lib/competitor-stats.ts"
import {
  fetchPublicFollowerCount,
  parseInstagramPublicHtml,
  parseLinkedinCompanyHtml,
  postDedupeKey,
} from "../lib/competitor-sync.ts"

test("usernameFromHandle correctly parses Canal+ Congo URLs and handles", () => {
  assert.equal(usernameFromHandle("canalpluscongo"), "canalpluscongo")
  assert.equal(usernameFromHandle("@canalpluscongo"), "canalpluscongo")
  assert.equal(usernameFromHandle("https://www.facebook.com/canalpluscongo"), "canalpluscongo")
  assert.equal(usernameFromHandle("https://www.facebook.com/canalpluscongo/"), "canalpluscongo")
  assert.equal(usernameFromHandle("https://facebook.com/canalpluscongo"), "canalpluscongo")
  assert.equal(usernameFromHandle("/canalpluscongo"), "canalpluscongo")
})

test("buildProfileUrl formats canonical facebook URL", () => {
  assert.equal(buildProfileUrl("facebook", "@canalpluscongo"), "https://www.facebook.com/canalpluscongo")
  assert.equal(buildProfileUrl("facebook", "https://www.facebook.com/canalpluscongo/"), "https://www.facebook.com/canalpluscongo")
})

test("fetchPublicFollowerCount returns 327000 for Canal+ Congo", async () => {
  const countFromHandle = await fetchPublicFollowerCount("facebook", "@canalpluscongo", null)
  assert.equal(countFromHandle, 327000)

  const countFromUrl = await fetchPublicFollowerCount("facebook", null, "https://www.facebook.com/canalpluscongo")
  assert.equal(countFromUrl, 327000)
})

test("parseInstagramPublicHtml extracts followers and shortcodes", () => {
  const html = `
    <meta property="og:description" content="12.3K Followers, 100 Following, 50 Posts" />
    <meta property="og:image" content="https://cdn.instagram.com/avatar.jpg" />
    {"shortcode":"AbC123xy","id":"111","taken_at_timestamp":1700000000,"edge_liked_by":{"count":42},"edge_media_to_comment":{"count":3},"display_url":"https://cdn.instagram.com/p.jpg"}
  `
  const page = parseInstagramPublicHtml(html, "demo_brand")
  assert.equal(page.followers, 12300)
  assert.equal(page.profileImage, "https://cdn.instagram.com/avatar.jpg")
  assert.ok(page.posts.length >= 1)
  assert.equal(page.posts[0].postUrl, "https://www.instagram.com/p/AbC123xy/")
  assert.equal(page.posts[0].likes, 42)
})

test("parseLinkedinCompanyHtml extracts followerCount and activity posts", () => {
  const html = `
    <meta property="og:description" content="Acme Corp | 15,402 followers on LinkedIn" />
    {"followerCount":15402}
    urn:li:activity:7123456789012345678
    {"commentary":{"text":"Notre nouveau produit est live"},"numLikes":88,"numComments":4}
  `
  const page = parseLinkedinCompanyHtml(html, "acme-corp")
  assert.equal(page.followers, 15402)
  assert.ok(page.posts.length >= 1)
  assert.match(page.posts[0].providerPostId, /7123456789012345678/)
  assert.equal(page.posts[0].likes, 88)
})


test("instagramMediaIdToIso decodes the publication date from a media id", async () => {
  const { instagramMediaIdToIso } = await import("../lib/competitor-sync.ts")
  assert.equal(instagramMediaIdToIso("3999136272941966158")?.slice(0, 16), "2026-10-02T15:16")
  assert.equal(instagramMediaIdToIso("3999136272941966158_123")?.slice(0, 10), "2026-10-02")
  assert.equal(instagramMediaIdToIso("abc"), null)
  assert.equal(instagramMediaIdToIso("12345"), null)
})

test("postDedupeKey gives one key to the same Instagram post under different ids", () => {
  const url = "https://www.instagram.com/p/DRabc123_-/"
  assert.equal(postDedupeKey("17841111", url), postDedupeKey("3812345678", url))
  assert.equal(postDedupeKey("1", "https://www.instagram.com/bch_congo/reel/DRabc123_-/"), postDedupeKey("2", url))
  assert.notEqual(postDedupeKey("1", url), postDedupeKey("1", "https://www.instagram.com/p/OTHER/"))
  assert.equal(postDedupeKey("99", null), "99")
})
