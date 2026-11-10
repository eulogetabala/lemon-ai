import test from "node:test"
import assert from "node:assert/strict"
import { usernameFromHandle, buildProfileUrl } from "../lib/competitor-stats.ts"
import { fetchPublicFollowerCount } from "../lib/competitor-sync.ts"

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

