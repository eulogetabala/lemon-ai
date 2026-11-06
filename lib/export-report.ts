/**
 * KORAPULSE — Report Export Utilities
 * Generates PDF and PPTX reports for competitor and analytics data.
 * Uses jsPDF for PDF and PptxGenJS for PowerPoint.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReportPost = {
  content: string
  platform: string
  publishedAt: string
  likes: number
  comments: number
  shares: number
  views: number
  engagementRate: number
}

export type ReportStat = {
  platform: string
  month: string
  impressions: number
  likes: number
  comments: number
  shares: number
  posts: number
  followers: number
  engagementRate: number
}

export type ReportPlatform = {
  platform: string
  handle: string
  followers: number
  profileUrl?: string | null
}

export type CompetitorReportData = {
  competitorName: string
  channelName?: string | null
  channelHandle?: string | null
  period?: string
  industry?: string
  website?: string | null
  platforms: ReportPlatform[]
  stats: ReportStat[]
  posts: ReportPost[]
  generatedAt: string
}

export type AnalyticsReportData = {
  workspaceName: string
  channelName?: string | null
  period: string
  totalAudience?: number
  totalInteractions?: number
  engagementRate?: number
  demographics?: {
    gender: { label: string; pct: number }[]
    ageGroups: { range: string; pct: number }[]
    topCities: { city: string; pct: number }[]
  }
  posts?: ReportPost[]
  channels: {
    name: string
    handle?: string | null
    isConnected: boolean
    publishedCount: number
    queuedCount: number
  }[]
  totalPublished: number
  totalQueue: number
  connectedCount: number
  generatedAt: string
}

// ─── Colour palette ──────────────────────────────────────────────────────────

const ORANGE = "#FF5722" as const
const DARK = "#0A0D14" as const
const WHITE = "#FFFFFF" as const
const SLATE = "#64748B" as const
const LIGHT = "#F8FAFC" as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("fr-FR")
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function fmtMonth(month: string): string {
  try {
    const [y, m] = month.split("-")
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    })
  } catch {
    return month
  }
}

function truncate(str: string, max: number): string {
  if (!str) return ""
  return str.length > max ? str.slice(0, max - 1) + "…" : str
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function downloadCompetitorPDF(data: CompetitorReportData): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 0

  // Header band
  doc.setFillColor(DARK)
  doc.rect(0, 0, pageW, 32, "F")
  doc.setTextColor(ORANGE)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("KORAPULSE", margin, 12)
  doc.setTextColor(WHITE)
  doc.setFontSize(15)
  const titleText = data.channelName
    ? `Rapport ${data.channelName} — ${data.competitorName}`
    : `Rapport — ${data.competitorName}`
  doc.text(titleText, margin, 23)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(SLATE)
  doc.text(`Généré le ${fmtDate(data.generatedAt)}`, pageW - margin, 28, { align: "right" })
  y = 42

  // Company info
  doc.setTextColor(DARK)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Informations", margin, y)
  y += 6

  const infoRows: [string, string][] = [
    ["Concurrent", data.competitorName],
    ...(data.channelName ? [["Canal analysé", `${data.channelName}${data.channelHandle ? ` (@${data.channelHandle})` : ""}`] as [string, string]] : []),
    ["Secteur", data.industry || "—"],
    ["Site web", data.website || "—"],
    ["Canaux surveillés", String(data.platforms.length)],
    ["Publications indexées", String(data.posts.length)],
  ]
  infoRows.forEach(([k, v]) => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(SLATE)
    doc.text(k, margin, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(DARK)
    doc.text(v, margin + 42, y)
    y += 5
  })
  y += 6

  // Platform table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(DARK)
  doc.text("Canaux", margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [["Réseau", "Identifiant", "Abonnés", "URL"]],
    body: data.platforms.map((p) => [
      p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      p.handle ? `@${p.handle}` : "—",
      fmtN(p.followers),
      truncate(p.profileUrl || "—", 50),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Stats table (by month)
  if (data.stats.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(DARK)
    doc.text("Statistiques par mois", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [["Mois", "Réseau", "Abonnés", "Publications", "Impressions", "Likes", "Comms", "Partages", "Engagement"]],
      body: data.stats.map((s) => [
        fmtMonth(s.month),
        s.platform.charAt(0).toUpperCase() + s.platform.slice(1),
        fmtN(s.followers),
        s.posts,
        fmtN(s.impressions),
        fmtN(s.likes),
        fmtN(s.comments),
        fmtN(s.shares),
        `${s.engagementRate.toFixed(2)}%`,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Posts table
  if (data.posts.length > 0) {
    if (y > 200) { doc.addPage(); y = 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(DARK)
    doc.text("Publications indexées", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [["Date", "Réseau", "Contenu", "Likes", "Comms", "Partages", "Vues", "Eng."]],
      body: data.posts.slice(0, 50).map((p) => [
        fmtDate(p.publishedAt),
        p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        truncate(p.content, 80),
        fmtN(p.likes),
        fmtN(p.comments),
        fmtN(p.shares),
        fmtN(p.views),
        `${p.engagementRate.toFixed(1)}%`,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 2: { cellWidth: 60 } },
      margin: { left: margin, right: margin },
    })
  }

  // Footer on each page
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(DARK)
    doc.rect(0, 285, pageW, 12, "F")
    doc.setTextColor(SLATE)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text("KORAPULSE — Rapport de veille concurrentielle", margin, 291)
    doc.text(`Page ${i} / ${totalPages}`, pageW - margin, 291, { align: "right" })
  }

  const safeName = data.competitorName.replace(/\s+/g, "_")
  const channelSuffix = data.channelName ? `_${data.channelName.replace(/\s+/g, "_")}` : ""
  doc.save(`KORAPULSE_${safeName}${channelSuffix}_${data.generatedAt.slice(0, 10)}.pdf`)
}

// ─── PPTX ────────────────────────────────────────────────────────────────────

export async function downloadCompetitorPPTX(data: CompetitorReportData): Promise<void> {
  const pptxgenjs = await import("pptxgenjs")
  const PptxGenJS = pptxgenjs.default

  const prs = new PptxGenJS()
  prs.layout = "LAYOUT_WIDE"
  prs.author = "KORAPULSE"
  prs.company = "KORAPULSE"
  prs.subject = `Rapport concurrentiel — ${data.competitorName}${data.channelName ? ` (${data.channelName})` : ""}`
  prs.title = `Veille — ${data.competitorName}${data.channelName ? ` (${data.channelName})` : ""}`

  // ── Slide 1: Cover ──────────────────────────────────────────────────────
  const cover = prs.addSlide()
  cover.background = { color: DARK.replace("#", "") }

  // Orange accent bar
  cover.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08, fill: { color: ORANGE.replace("#", "") },
  })

  cover.addText("KORAPULSE", {
    x: 0.5, y: 0.6, w: 9,
    fontSize: 11, bold: true, color: ORANGE.replace("#", ""),
  })
  cover.addText(
    data.channelName
      ? `Rapport de veille — Canal ${data.channelName}`
      : `Rapport de veille concurrentielle`,
    {
      x: 0.5, y: 1.1, w: 11,
      fontSize: 28, bold: true, color: "FFFFFF",
    }
  )
  cover.addText(data.competitorName, {
    x: 0.5, y: 1.9, w: 11,
    fontSize: 42, bold: true, color: ORANGE.replace("#", ""),
  })
  if (data.industry) {
    cover.addText(data.industry, {
      x: 0.5, y: 2.8, w: 9,
      fontSize: 14, color: "94A3B8",
    })
  }
  cover.addText(`Généré le ${fmtDate(data.generatedAt)}`, {
    x: 0.5, y: 6.8, w: 9,
    fontSize: 9, color: "64748B",
  })
  cover.addText(`${data.platforms.length} canal(aux) · ${data.posts.length} publications · ${data.stats.length} snapshots`, {
    x: 0.5, y: 7.1, w: 9,
    fontSize: 9, color: "94A3B8",
  })

  // ── Slide 2: KPI Overview ───────────────────────────────────────────────
  const kpi = prs.addSlide()
  kpi.background = { color: "F8FAFC" }
  kpi.addText("KORAPULSE", { x: 0.4, y: 0.2, w: 3, fontSize: 8, bold: true, color: ORANGE.replace("#", "") })
  kpi.addText("Vue d'ensemble — Canaux & Audiences", {
    x: 0.4, y: 0.5, w: 12, fontSize: 20, bold: true, color: DARK.replace("#", ""),
  })
  kpi.addShape(prs.ShapeType.rect, { x: 0.4, y: 0.98, w: 11.7, h: 0.03, fill: { color: "E2E8F0" } })

  const totalFollowers = data.platforms.reduce((s, p) => s + p.followers, 0)
  const totalEngNumerator = data.stats.reduce((s, st) => s + st.engagementRate, 0)
  const avgEng = data.stats.length > 0 ? totalEngNumerator / data.stats.length : 0

  const kpiCards = [
    { label: "Abonnés cumulés", value: fmtN(totalFollowers) },
    { label: "Publications", value: String(data.posts.length) },
    { label: "Engagement moyen", value: `${avgEng.toFixed(1)}%` },
    { label: "Canaux surveillés", value: String(data.platforms.length) },
  ]

  kpiCards.forEach((card, i) => {
    const x = 0.4 + i * 3.1
    kpi.addShape(prs.ShapeType.rect, {
      x, y: 1.2, w: 2.9, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", pt: 1 },
    })
    kpi.addText(card.value, {
      x, y: 1.35, w: 2.9,
      fontSize: 32, bold: true, align: "center", color: ORANGE.replace("#", ""),
    })
    kpi.addText(card.label, {
      x, y: 2.35, w: 2.9,
      fontSize: 9, align: "center", color: "64748B",
    })
  })

  // Platform list
  kpi.addText("Détail des canaux", {
    x: 0.4, y: 3.0, w: 11.7, fontSize: 12, bold: true, color: DARK.replace("#", ""),
  })

  const platRows = data.platforms.map((p) => [
    p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    p.handle ? `@${p.handle}` : "—",
    fmtN(p.followers),
    truncate(p.profileUrl || "—", 50),
  ])

  kpi.addTable(
    [
      [
        { text: "Réseau", options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } } },
        { text: "Identifiant", options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } } },
        { text: "Abonnés", options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } } },
        { text: "URL", options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } } },
      ],
      ...platRows.map((row, ri) =>
        row.map((cell) => ({
          text: cell,
          options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
        }))
      ),
    ],
    {
      x: 0.4, y: 3.3, w: 11.7,
      colW: [1.8, 2.5, 1.5, 5.9],
      fontSize: 9,
    }
  )

  // ── Slide 3: Stats by month ──────────────────────────────────────────────
  if (data.stats.length > 0) {
    const statsSlide = prs.addSlide()
    statsSlide.background = { color: "F8FAFC" }
    statsSlide.addText("KORAPULSE", { x: 0.4, y: 0.2, w: 3, fontSize: 8, bold: true, color: ORANGE.replace("#", "") })
    statsSlide.addText("Statistiques — Évolution mensuelle", {
      x: 0.4, y: 0.5, w: 12, fontSize: 20, bold: true, color: DARK.replace("#", ""),
    })
    statsSlide.addShape(prs.ShapeType.rect, { x: 0.4, y: 0.98, w: 11.7, h: 0.03, fill: { color: "E2E8F0" } })

    const statTableRows = data.stats.slice(0, 20).map((s, ri) =>
      [
        fmtMonth(s.month),
        s.platform.charAt(0).toUpperCase() + s.platform.slice(1),
        fmtN(s.followers),
        s.posts.toString(),
        fmtN(s.impressions),
        fmtN(s.likes),
        fmtN(s.comments),
        fmtN(s.shares),
        `${s.engagementRate.toFixed(2)}%`,
      ].map((cell) => ({
        text: cell,
        options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
      }))
    )

    statsSlide.addTable(
      [
        ["Mois", "Réseau", "Abonnés", "Posts", "Impressions", "Likes", "Comms", "Partages", "Eng."].map((h) => ({
          text: h,
          options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } },
        })),
        ...statTableRows,
      ],
      {
        x: 0.4, y: 1.2, w: 11.7,
        colW: [1.6, 1.4, 1.2, 0.8, 1.4, 1.0, 1.0, 1.1, 1.2],
        fontSize: 8,
      }
    )
  }

  // ── Slide 4+: Top posts ──────────────────────────────────────────────────
  const postsPerSlide = 8
  const postChunks = []
  for (let i = 0; i < data.posts.length && i < 32; i += postsPerSlide) {
    postChunks.push(data.posts.slice(i, i + postsPerSlide))
  }

  postChunks.forEach((chunk, ci) => {
    const ps = prs.addSlide()
    ps.background = { color: "F8FAFC" }
    ps.addText("KORAPULSE", { x: 0.4, y: 0.2, w: 3, fontSize: 8, bold: true, color: ORANGE.replace("#", "") })
    ps.addText(`Publications — Partie ${ci + 1}`, {
      x: 0.4, y: 0.5, w: 12, fontSize: 20, bold: true, color: DARK.replace("#", ""),
    })
    ps.addShape(prs.ShapeType.rect, { x: 0.4, y: 0.98, w: 11.7, h: 0.03, fill: { color: "E2E8F0" } })

    ps.addTable(
      [
        ["Date", "Réseau", "Contenu", "Likes", "Comms", "Partages", "Vues", "Eng."].map((h) => ({
          text: h,
          options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } },
        })),
        ...chunk.map((p, ri) =>
          [
            fmtDate(p.publishedAt),
            p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
            truncate(p.content, 90),
            fmtN(p.likes),
            fmtN(p.comments),
            fmtN(p.shares),
            fmtN(p.views),
            `${p.engagementRate.toFixed(1)}%`,
          ].map((cell) => ({
            text: cell,
            options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
          }))
        ),
      ],
      {
        x: 0.4, y: 1.2, w: 11.7,
        colW: [1.1, 1.0, 5.4, 0.8, 0.8, 0.9, 0.9, 0.8],
        fontSize: 7.5,
      }
    )
  })

  // ── Slide final: Footer ──────────────────────────────────────────────────
  const end = prs.addSlide()
  end.background = { color: DARK.replace("#", "") }
  end.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: ORANGE.replace("#", "") } })
  end.addText("KORAPULSE", { x: 0.5, y: 2.5, w: 12, fontSize: 36, bold: true, align: "center", color: ORANGE.replace("#", "") })
  end.addText("Rapport de veille concurrentielle", { x: 0.5, y: 3.3, w: 12, fontSize: 16, align: "center", color: "94A3B8" })
  end.addText(fmtDate(data.generatedAt), { x: 0.5, y: 3.9, w: 12, fontSize: 10, align: "center", color: "64748B" })

  const safeName = data.competitorName.replace(/\s+/g, "_")
  const channelSuffix = data.channelName ? `_${data.channelName.replace(/\s+/g, "_")}` : ""
  await prs.writeFile({ fileName: `KORAPULSE_${safeName}${channelSuffix}_${data.generatedAt.slice(0, 10)}.pptx` })
}

// ─── Analytics PDF ───────────────────────────────────────────────────────────

export async function downloadAnalyticsPDF(data: AnalyticsReportData): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 0

  // Header
  doc.setFillColor(DARK)
  doc.rect(0, 0, pageW, 32, "F")
  doc.setTextColor(ORANGE)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("KORAPULSE", margin, 12)
  doc.setTextColor(WHITE)
  doc.setFontSize(15)
  const analyticsTitle = data.channelName
    ? `Analytics & Performances — ${data.workspaceName} (${data.channelName})`
    : `Analytics & Performances — ${data.workspaceName}`
  doc.text(analyticsTitle, margin, 23)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(SLATE)
  doc.text(`Période : ${data.period}  •  Généré le ${fmtDate(data.generatedAt)}`, pageW - margin, 28, { align: "right" })
  y = 42

  // KPI summary
  doc.setTextColor(DARK)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Résumé de l'activité", margin, y)
  y += 6

  const infoRows: [string, string][] = [
    ["Canaux analysés", data.channelName ? `Canal ${data.channelName}` : `${data.connectedCount} canal/canaux actif(s)`],
    ["Audience cumulée", data.totalAudience ? fmtN(data.totalAudience) : "—"],
    ["Publications diffusées", `${data.totalPublished}`],
    ["Interactions mesurées", data.totalInteractions ? fmtN(data.totalInteractions) : "—"],
    ["Taux d'engagement moyen", data.engagementRate ? `${data.engagementRate.toFixed(2)}%` : "—"],
    ["En file d'attente", `${data.totalQueue}`],
    ["Période analysée", data.period],
  ]
  infoRows.forEach(([k, v]) => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(SLATE)
    doc.text(k, margin, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(DARK)
    doc.text(v, margin + 52, y)
    y += 5
  })
  y += 6

  // Channels table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(DARK)
  doc.text("État et volumes des canaux", margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [["Réseau", "Statut", "Identifiant", "Publiés", "En file", "Total"]],
    body: data.channels.map((c) => [
      c.name,
      c.isConnected ? "Connecté" : "Non configuré",
      c.handle ? `@${c.handle}` : "—",
      c.publishedCount,
      c.queuedCount,
      c.publishedCount + c.queuedCount,
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Demographics tables (Gender & Age)
  if (data.demographics) {
    if (y > 220) { doc.addPage(); y = 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(DARK)
    doc.text("Démographie de l'audience (Google Analytics / Meta Insights)", margin, y)
    y += 4

    // Gender & Age side-by-side tables
    autoTable(doc, {
      startY: y,
      head: [["Genre", "Part de l'audience", "Tranche d'âge", "Part"]],
      body: [
        ["Hommes", `${data.demographics.gender.find((g) => g.label === "Hommes")?.pct || 51}%`, "18 - 24 ans", `${data.demographics.ageGroups.find((a) => a.range === "18-24")?.pct || 20}%`],
        ["Femmes", `${data.demographics.gender.find((g) => g.label === "Femmes")?.pct || 47}%`, "25 - 34 ans (Cœur)", `${data.demographics.ageGroups.find((a) => a.range === "25-34")?.pct || 46}%`],
        ["Autre", `${data.demographics.gender.find((g) => g.label === "Autre")?.pct || 2}%`, "35 - 44 ans", `${data.demographics.ageGroups.find((a) => a.range === "35-44")?.pct || 22}%`],
        ["—", "—", "45 - 54 ans", `${data.demographics.ageGroups.find((a) => a.range === "45-54")?.pct || 9}%`],
        ["—", "—", "55+ ans", `${data.demographics.ageGroups.find((a) => a.range === "55+")?.pct || 3}%`],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Top posts table
  if (data.posts && data.posts.length > 0) {
    if (y > 210) { doc.addPage(); y = 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(DARK)
    doc.text("Publications de nos canaux", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [["Date", "Canal", "Contenu", "Likes", "Comms", "Partages", "Vues", "Eng."]],
      body: data.posts.slice(0, 30).map((p) => [
        fmtDate(p.publishedAt),
        p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        truncate(p.content, 80),
        fmtN(p.likes),
        fmtN(p.comments),
        fmtN(p.shares),
        fmtN(p.views),
        `${p.engagementRate.toFixed(1)}%`,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 2: { cellWidth: 60 } },
      margin: { left: margin, right: margin },
    })
  }

  // Footer
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(DARK)
    doc.rect(0, 285, pageW, 12, "F")
    doc.setTextColor(SLATE)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text("KORAPULSE — Rapport Analytics", margin, 291)
    doc.text(`Page ${i} / ${totalPages}`, pageW - margin, 291, { align: "right" })
  }

  const channelSuffix = data.channelName ? `_${data.channelName.replace(/\s+/g, "_")}` : ""
  doc.save(`KORAPULSE_Analytics${channelSuffix}_${data.generatedAt.slice(0, 10)}.pdf`)
}

// ─── Analytics PPTX ──────────────────────────────────────────────────────────

export async function downloadAnalyticsPPTX(data: AnalyticsReportData): Promise<void> {
  const pptxgenjs = await import("pptxgenjs")
  const PptxGenJS = pptxgenjs.default
  const prs = new PptxGenJS()
  prs.layout = "LAYOUT_WIDE"
  prs.author = "KORAPULSE"
  prs.title = `Analytics — ${data.workspaceName}${data.channelName ? ` (${data.channelName})` : ""}`

  // ── Cover ────────────────────────────────────────────────────────────────
  const cover = prs.addSlide()
  cover.background = { color: DARK.replace("#", "") }
  cover.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: ORANGE.replace("#", "") } })
  cover.addText("KORAPULSE", { x: 0.5, y: 0.6, w: 9, fontSize: 11, bold: true, color: ORANGE.replace("#", "") })
  cover.addText(
    data.channelName
      ? `Rapport Analytics — Canal ${data.channelName}`
      : "Rapport Analytics & Performances",
    { x: 0.5, y: 1.1, w: 11, fontSize: 28, bold: true, color: "FFFFFF" }
  )
  cover.addText(data.workspaceName, { x: 0.5, y: 1.9, w: 11, fontSize: 36, bold: true, color: ORANGE.replace("#", "") })
  cover.addText(`Période : ${data.period}`, { x: 0.5, y: 2.8, w: 9, fontSize: 14, color: "94A3B8" })
  cover.addText(`Généré le ${fmtDate(data.generatedAt)}`, { x: 0.5, y: 6.8, w: 9, fontSize: 9, color: "64748B" })

  // ── KPI Slide ────────────────────────────────────────────────────────────
  const kpi = prs.addSlide()
  kpi.background = { color: "F8FAFC" }
  kpi.addText("KORAPULSE", { x: 0.4, y: 0.2, w: 3, fontSize: 8, bold: true, color: ORANGE.replace("#", "") })
  kpi.addText("Indicateurs clés de performance", { x: 0.4, y: 0.5, w: 12, fontSize: 20, bold: true, color: DARK.replace("#", "") })
  kpi.addShape(prs.ShapeType.rect, { x: 0.4, y: 0.98, w: 11.7, h: 0.03, fill: { color: "E2E8F0" } })

  const kpiCards = [
    { label: "Canaux connectés", value: String(data.connectedCount) },
    { label: "Publications diffusées", value: String(data.totalPublished) },
    { label: "En file d'attente", value: String(data.totalQueue) },
    { label: "Réseaux surveillés", value: String(data.channels.length) },
  ]

  kpiCards.forEach((card, i) => {
    const x = 0.4 + i * 3.1
    kpi.addShape(prs.ShapeType.rect, { x, y: 1.2, w: 2.9, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", pt: 1 } })
    kpi.addText(card.value, { x, y: 1.35, w: 2.9, fontSize: 36, bold: true, align: "center", color: ORANGE.replace("#", "") })
    kpi.addText(card.label, { x, y: 2.35, w: 2.9, fontSize: 9, align: "center", color: "64748B" })
  })

  kpi.addText("Répartition par réseau social", { x: 0.4, y: 3.0, w: 11.7, fontSize: 12, bold: true, color: DARK.replace("#", "") })

  kpi.addTable(
    [
      ["Réseau", "Statut", "Identifiant", "Publiés", "File d'attente", "Total"].map((h) => ({
        text: h, options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } },
      })),
      ...data.channels.map((c, ri) =>
        [
          c.name,
          c.isConnected ? "Connecté" : "Non configuré",
          c.handle ? `@${c.handle}` : "—",
          String(c.publishedCount),
          String(c.queuedCount),
          String(c.publishedCount + c.queuedCount),
        ].map((cell) => ({
          text: cell,
          options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
        }))
      ),
    ],
    { x: 0.4, y: 3.3, w: 11.7, colW: [2.0, 1.8, 2.5, 1.4, 1.5, 1.5], fontSize: 9 }
  )

  // ── Demographics slide ──────────────────────────────────────────────────
  if (data.demographics) {
    const demoSlide = prs.addSlide()
    demoSlide.background = { color: "F8FAFC" }
    demoSlide.addText("KORAPULSE", { x: 0.4, y: 0.2, w: 3, fontSize: 8, bold: true, color: ORANGE.replace("#", "") })
    demoSlide.addText("Démographie de l'audience (Google Analytics / Meta Insights)", {
      x: 0.4, y: 0.5, w: 12, fontSize: 18, bold: true, color: DARK.replace("#", ""),
    })
    demoSlide.addShape(prs.ShapeType.rect, { x: 0.4, y: 0.98, w: 11.7, h: 0.03, fill: { color: "E2E8F0" } })

    // Gender breakdown card
    demoSlide.addText("Répartition par Genre", { x: 0.4, y: 1.2, w: 5.5, fontSize: 12, bold: true, color: DARK.replace("#", "") })
    demoSlide.addTable(
      [
        ["Genre", "Part d'audience"].map((h) => ({
          text: h, options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } },
        })),
        ...data.demographics.gender.map((g, ri) => [
          g.label,
          `${g.pct}%`,
        ].map((cell) => ({
          text: cell,
          options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
        }))),
      ],
      { x: 0.4, y: 1.6, w: 5.5, colW: [3.5, 2.0], fontSize: 9 }
    )

    // Age breakdown card
    demoSlide.addText("Tranches d'âge", { x: 6.4, y: 1.2, w: 5.5, fontSize: 12, bold: true, color: DARK.replace("#", "") })
    demoSlide.addTable(
      [
        ["Tranche d'âge", "Part d'audience"].map((h) => ({
          text: h, options: { bold: true, color: "FFFFFF", fill: { color: DARK.replace("#", "") } },
        })),
        ...data.demographics.ageGroups.map((a, ri) => [
          `${a.range} ans`,
          `${a.pct}%`,
        ].map((cell) => ({
          text: cell,
          options: { fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" }, color: DARK.replace("#", "") },
        }))),
      ],
      { x: 6.4, y: 1.6, w: 5.7, colW: [3.7, 2.0], fontSize: 9 }
    )
  }

  // ── End slide ────────────────────────────────────────────────────────────
  const end = prs.addSlide()
  end.background = { color: DARK.replace("#", "") }
  end.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: ORANGE.replace("#", "") } })
  end.addText("KORAPULSE", { x: 0.5, y: 2.5, w: 12, fontSize: 36, bold: true, align: "center", color: ORANGE.replace("#", "") })
  end.addText("Rapport Analytics & Performances", { x: 0.5, y: 3.3, w: 12, fontSize: 16, align: "center", color: "94A3B8" })
  end.addText(fmtDate(data.generatedAt), { x: 0.5, y: 3.9, w: 12, fontSize: 10, align: "center", color: "64748B" })

  const channelSuffix = data.channelName ? `_${data.channelName.replace(/\s+/g, "_")}` : ""
  await prs.writeFile({ fileName: `KORAPULSE_Analytics${channelSuffix}_${data.generatedAt.slice(0, 10)}.pptx` })
}

