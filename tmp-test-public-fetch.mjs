import { createRequire } from "module"
import { register } from "node:module"
import { pathToFileURL } from "node:url"

// Load TS via next's compiled approach isn't available; duplicate minimal live check
// by fetching HTML and applying the same regexes/walk as the updated parser.

const FB_CRAWLER = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"

function walkJson(node, visit) {
  if (Array.isArray(node)) {
    for (const item of node) walkJson(item, visit)
    return
  }
  if (!node || typeof node !== "object") return
  visit(node)
  for (const value of Object.values(node)) walkJson(value, visit)
}

function parseCountLoose(raw) {
  const cleaned = raw
    .replace(/\u202f|\u00a0|\s/g, "")
    .replace(/,/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KkMmBb])?$/)
  if (!match) {
    const digits = Number(cleaned.replace(/[^\d]/g, ""))
    return Number.isFinite(digits) && digits > 0 ? digits : undefined
  }
  const base = Number(match[1])
  const suffix = (match[2] || "").toLowerCase()
  const mult = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : suffix === "b" ? 1e9 : 1
  return Math.round(base * mult)
}

function parseIg(html, username) {
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ""
  const desc = ogDesc.replace(/&nbsp;|&#xA0;|&#160;/gi, " ").replace(/&amp;/gi, "&")
  const followerMatch = desc.match(/([0-9][0-9\s.,\u202f]*[KkMmBb]?)\s*(?:Followers|abonnés|followers)/i)
  let followers = followerMatch?.[1] ? parseCountLoose(followerMatch[1]) : undefined
  const fc = html.match(/"follower_count"\s*:\s*(\d+)/i)?.[1]
  if (fc) followers = Number(fc)

  const posts = []
  const seen = new Set()
  const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch
  while ((scriptMatch = scriptRe.exec(html)) !== null) {
    const body = scriptMatch[1]
    if (!body.includes("__isXIGPolarisMedia") && !body.includes("seo_canonical_url")) continue
    let data
    try {
      data = JSON.parse(body)
    } catch {
      continue
    }
    walkJson(data, (node) => {
      const isMedia =
        node.__isXIGPolarisMedia === true ||
        (typeof node.pk === "string" &&
          /^\d{10,}$/.test(node.pk) &&
          (node.image_versions2 || node.seo_canonical_url || node.caption))
      if (!isMedia) return
      const mediaId = String(node.id ?? node.pk ?? "").replace(/^POLARIS_/, "")
      if (!mediaId || seen.has(mediaId)) return
      if (!/^\d{10,}$/.test(mediaId) && !String(node.id || "").startsWith("POLARIS_")) return
      const caption =
        typeof node.caption?.text === "string"
          ? node.caption.text
          : typeof node.caption === "string"
            ? node.caption
            : ""
      const url = Array.isArray(node.image_versions2?.candidates)
        ? node.image_versions2.candidates[0]?.url
        : null
      seen.add(mediaId)
      posts.push({
        id: mediaId,
        caption: caption.slice(0, 60),
        url: node.seo_canonical_url || null,
        mediaUrl: !!url,
      })
    })
  }
  return { followers, posts: posts.slice(0, 12) }
}

function parseLi(html) {
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ""
  const desc = ogDesc.replace(/&amp;/gi, "&")
  const followerMatch = desc.match(/([0-9][0-9\s.,\u202f]*[KkMmBb]?)\s*(?:followers|abonnés)/i)
  const followers = followerMatch?.[1] ? parseCountLoose(followerMatch[1]) : undefined
  const activities = [...new Set([...html.matchAll(/urn:li:activity:(\d+)/g)].map((m) => m[1]))]
  return { followers, activities: activities.length, sample: activities.slice(0, 3) }
}

const igRes = await fetch("https://www.instagram.com/natgeo/", {
  headers: { "User-Agent": FB_CRAWLER, Accept: "text/html" },
})
const igHtml = await igRes.text()
console.log("IG", parseIg(igHtml, "natgeo"))

const liRes = await fetch("https://www.linkedin.com/company/google/", {
  headers: { "User-Agent": FB_CRAWLER, Accept: "text/html" },
})
const liHtml = await liRes.text()
console.log("LI", parseLi(liHtml))
