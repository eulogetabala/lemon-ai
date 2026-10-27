import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  getPlatformCredential,
  syncCompetitorPlatform,
  type SyncResult,
} from "@/lib/competitor-sync"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const { data: competitor } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (!competitor) return NextResponse.json({ error: "Concurrent introuvable" }, { status: 404 })

    const { data: platformRows } = await supabase
      .from("competitor_platforms")
      .select("*")
      .eq("competitor_id", id)

    const results: SyncResult[] = []
    for (const platformRow of platformRows ?? []) {
      const credential = await getPlatformCredential(supabase, userId, platformRow.platform)
      const result = await syncCompetitorPlatform(supabase, platformRow, credential)
      results.push(result)
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[competitor/[id]/sync] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
