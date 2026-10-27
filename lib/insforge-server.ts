import { auth } from '@clerk/nextjs/server';
import { createClient, type InsForgeClient } from '@insforge/sdk';

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
const PROJECT_API_KEY = process.env.INSFORGE_PROJECT_API_KEY
const TOKEN_TEMPLATE = process.env.CLERK_INSFORGE_TEMPLATE ?? 'insforge'

// ─── Token cache ──────────────────────────────────────────────────────────────
// Clerk dev instances have strict rate limits on getToken() calls.
// Cache tokens for 55s (just under the 60s JWT expiry).
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getCachedToken(
  session: Awaited<ReturnType<typeof auth>>,
  userId: string,
): Promise<string | null> {
  const cached = tokenCache.get(userId)
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token
  }

  // 1. Try the configured JWT template (requires setup in Clerk dashboard)
  let token = await session.getToken({ template: TOKEN_TEMPLATE }).catch(() => null)

  // 2. Fallback to default session token
  if (!token) {
    token = await session.getToken().catch(() => null)
  }

  if (token) {
    tokenCache.set(userId, { token, expiresAt: Date.now() + 55_000 })
  }

  return token
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an Insforge client + the authenticated userId.
 *
 * Strategy:
 *  1. Authenticate the user via Clerk (always).
 *  2. Try to get a signed JWT for Insforge (template + fallback).
 *  3. If we get a JWT → use it as the auth token (user-scoped RLS).
 *  4. If we cannot get a valid JWT (template not configured, rate limit, etc.)
 *     → fall back to the project API key (admin-level client).
 *     Security is maintained because every API route already filters queries
 *     by `userId` returned from this function.
 *
 * NOTE: To remove the fallback and use proper user-scoped RLS, create a JWT
 * template named "insforge" in your Clerk dashboard:
 * https://dashboard.clerk.com/apps/[app-id]/jwt-templates
 */
export async function getInsforgeServerClient(): Promise<{
  insforge: InsForgeClient
  userId: string | null
}> {
  if (!BASE_URL) throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL')
  if (!ANON_KEY) throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY')

  const session = await auth()
  const { userId } = session

  if (userId) {
    const token = await getCachedToken(session, userId)

    if (token) {
      // Happy path: user JWT obtained → user-scoped client
      const insforge = createClient({ baseUrl: BASE_URL!, anonKey: ANON_KEY! })
      insforge.getHttpClient().setAuthToken(token)
      return { insforge, userId }
    }

    // JWT unavailable → admin client fallback
    // Security: all routes filter by userId, so data isolation is preserved.
    console.warn(
      '[insforge] Could not obtain a user JWT. ' +
      'Using admin client fallback. ' +
      'To fix: create a JWT template named "' + TOKEN_TEMPLATE + '" at ' +
      'https://dashboard.clerk.com/apps/[app-id]/jwt-templates'
    )
    const insforge = getInsforgeAdminClient()
    return { insforge, userId }
  }

  // No user session → return unauthenticated client (routes will return 401)
  const insforge = createClient({ baseUrl: BASE_URL!, anonKey: ANON_KEY! })
  return { insforge, userId: null }
}

/**
 * Admin / upload client — uses the project API key as auth token.
 * The uak_ (User Admin Key) is a Bearer token, not an anonKey.
 */
export function getInsforgeAdminClient(): InsForgeClient {
  if (!BASE_URL) throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL')
  if (!ANON_KEY) throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY')
  if (!PROJECT_API_KEY) throw new Error('Missing INSFORGE_PROJECT_API_KEY')

  const client = createClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,     // public key (ik_...)
    isServerMode: true,
  })

  // Set the admin API key (uak_...) as the Bearer auth token
  client.getHttpClient().setAuthToken(PROJECT_API_KEY)

  return client
}

export const getInsforgeUploadClient = getInsforgeAdminClient
