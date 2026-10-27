import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
  FACEBOOK_PAGE_SELECT_COOKIE,
  decodeFacebookPageSelectSession,
  listFacebookPages,
} from "@/lib/social-oauth/facebook-pages"

export async function GET() {
  try {
    const { userId } = await getSupabaseServerClient()
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const session = decodeFacebookPageSelectSession(
      cookieStore.get(FACEBOOK_PAGE_SELECT_COOKIE)?.value,
    )

    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { error: "Session de sélection Facebook expirée. Reconnectez Facebook." },
        { status: 400 },
      )
    }

    const pages = await listFacebookPages(session.userAccessToken)

    return NextResponse.json({
      pages: pages.map(({ id, name, pictureUrl }) => ({ id, name, pictureUrl })),
    })
  } catch (error) {
    console.error("[facebook/pages]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Échec du chargement des pages" },
      { status: 500 },
    )
  }
}
