import { NextRequest, NextResponse } from "next/server"
import { encrypt } from "@/lib/encryption"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  FACEBOOK_PAGE_SELECT_COOKIE,
  decodeFacebookPageSelectSession,
  listFacebookPages,
} from "@/lib/social-oauth/facebook-pages"

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseServerClient()
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const pageId = typeof body?.pageId === "string" ? body.pageId.trim() : ""
    if (!pageId) {
      return NextResponse.json({ error: "pageId requis" }, { status: 400 })
    }

    const session = decodeFacebookPageSelectSession(
      request.cookies.get(FACEBOOK_PAGE_SELECT_COOKIE)?.value,
    )

    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { error: "Session de sélection Facebook expirée. Reconnectez Facebook." },
        { status: 400 },
      )
    }

    const pages = await listFacebookPages(session.userAccessToken)
    const page = pages.find((p) => p.id === pageId)

    if (!page) {
      return NextResponse.json(
        { error: "Cette page n'est plus disponible. Reconnectez Facebook." },
        { status: 404 },
      )
    }

    const payload = {
      user_id: session.userId,
      channel_type_id: session.channelTypeId,
      provider_account_id: page.id,
      handle: page.name,
      profile_url: `https://facebook.com/${page.id}`,
      profile_image: page.pictureUrl,
      access_token: encrypt(page.accessToken),
      refresh_token: null,
      token_expires_at: session.tokenExpiresAt,
      is_connected: true,
      is_active: true,
    }

    const { error } = await supabase
      .from("user_channels")
      .upsert(payload, { onConflict: "user_id,channel_type_id,provider_account_id" })

    if (error) {
      console.error("[facebook/select] upsert", error)
      return NextResponse.json({ error: "Échec de l'enregistrement de la page" }, { status: 500 })
    }

    const response = NextResponse.json({
      ok: true,
      page: { id: page.id, name: page.name, pictureUrl: page.pictureUrl },
    })
    response.cookies.delete(FACEBOOK_PAGE_SELECT_COOKIE)
    return response
  } catch (error) {
    console.error("[facebook/select]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Échec de la sélection" },
      { status: 500 },
    )
  }
}
