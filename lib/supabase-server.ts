import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ─── Token cache (avoid hitting Clerk rate limits in dev) ─────────────────────
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getCachedClerkToken(
  session: Awaited<ReturnType<typeof auth>>,
  userId: string,
): Promise<string | null> {
  const cached = tokenCache.get(userId)
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token

  // Supabase expects the Clerk JWT — use the "insforge" template if it exists,
  // otherwise the default session token works when Supabase JWT secret is the
  // Clerk JWKS endpoint (configured in Supabase Dashboard > Auth > JWT).
  const token =
    (await session.getToken({ template: 'supabase' }).catch(() => null)) ??
    (await session.getToken().catch(() => null))

  if (token) tokenCache.set(userId, { token, expiresAt: Date.now() + 55_000 })
  return token
}

// ─── Per-request user client ──────────────────────────────────────────────────
/**
 * Returns a Supabase client scoped to the current user.
 * RLS policies on tables use  auth.jwt() ->> 'sub'  to match the Clerk userId.
 */
export async function getSupabaseServerClient(): Promise<{
  supabase: SupabaseClient
  userId: string | null
}> {
  if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_ANON_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const session = await auth()
  const { userId } = session

  if (!userId) {
    // Unauthenticated — return anon client (routes will guard with userId check)
    return { supabase: createClient(SUPABASE_URL, SUPABASE_ANON_KEY), userId: null }
  }

  const token = await getCachedClerkToken(session, userId)

  // Pass the Clerk JWT as Authorization header so Supabase RLS can read it
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })

  return { supabase, userId }
}

// ─── Service-role (admin) client ──────────────────────────────────────────────
/**
 * Bypasses RLS — use only on the server for admin operations (uploads, etc.).
 * Falls back to anon key if service role key is not configured.
 * Always filter by userId manually when using this client.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')

  // Use service role key if available (bypasses RLS), otherwise anon key
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  })
}

export const getSupabaseUploadClient = getSupabaseAdminClient
