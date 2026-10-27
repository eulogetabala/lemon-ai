import { ChannelTypeEnum } from "@/constants/channels";
import { OAuthProvider, OAuthTokenResponse } from "./types";

function getEnv(key: string) {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is missing.`)
  return value
}

function getConfig(type:ChannelTypeEnum) {
    return {
        authUrl: getEnv(`${type}_AUTH_URL`),
        tokenUrl: getEnv(`${type}_TOKEN_URL`),
        profileUrl: getEnv(`${type}_PROFILE_URL`),
        clientId: getEnv(`${type}_CLIENT_ID`),
        clientSecret: getEnv(`${type}_CLIENT_SECRET`),
        scope: getEnv(`${type}_SCOPES`).split(',').map(s => s.trim()).filter(Boolean),
    }
}



/** Safely parse a token-endpoint response and surface the REAL error. */
async function parseTokenResponse(response: Response) {
  const text = await response.text()

  if (!response.ok) {
    let data: Record<string, any> = {}
    if (text) {
      try { data = JSON.parse(text) } catch { /* non-JSON error body */ }
    }
    const message =
      data?.error?.message ||
      data?.error_description ||
      data?.error ||
      data?.message ||
      (text ? text.slice(0, 200) : null) ||
      `Token exchange failed (HTTP ${response.status} ${response.statusText})`
    throw new Error(typeof message === "string" ? message : JSON.stringify(message))
  }

  if (!text) {
    throw new Error(`Token exchange returned an empty response (HTTP ${response.status})`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Token exchange returned a non-JSON response (HTTP ${response.status})`)
  }
}

async function requestToken(
    type:ChannelTypeEnum,
    body: URLSearchParams,
){
    const config = getConfig(type);

  // Facebook documents token exchange as GET with query params. Instagram's
  // `api.instagram.com/oauth/access_token` requires POST (form body).
  if (type === ChannelTypeEnum.FACEBOOK) {
    const url = `${config.tokenUrl}?${body.toString()}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
    return parseTokenResponse(response)
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  if(type === ChannelTypeEnum.TWITTER && config.clientSecret){
     const auth_header = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
     headers.Authorization = `Basic ${auth_header}`
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body,
  })

  return parseTokenResponse(response)
}

/** Exchange a short-lived Meta user token (~1h) for a long-lived one (~60 days). */
async function exchangeFacebookLongLivedToken(shortLivedToken: string) {
  const config = getConfig(ChannelTypeEnum.FACEBOOK)
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    fb_exchange_token: shortLivedToken,
  })
  const response = await fetch(`${config.tokenUrl}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  const data = await response.json()
  if (!response.ok || data?.error || !data?.access_token) {
    console.warn("[facebook] long-lived token exchange failed, keeping short-lived token", data?.error)
    return null
  }
  const seconds = Number(data.expires_in)
  return {
    accessToken: data.access_token as string,
    expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null,
  }
}


function createProvider(type:ChannelTypeEnum,opts: { pkce?: boolean} = {}): OAuthProvider {
   return {
    type,
    getAuthorizationUrl: ({state, redirectUri, codeChallenge, codeChallengeMethod}) => {
       const config = getConfig(type)
       // Meta platforms (Facebook, Instagram, Threads) and TikTok expect a
       // comma-separated scope list. Standard OAuth providers (Twitter/X,
       // LinkedIn, Google) expect a space-separated list.
       const commaSeparated = [ChannelTypeEnum.FACEBOOK, ChannelTypeEnum.INSTAGRAM, ChannelTypeEnum.THREADS, ChannelTypeEnum.TIKTOK].includes(type)
       const scopeSeparator = commaSeparated ? ',' : ' '
       // Build authorization URL with query parameters
       const params = new URLSearchParams({
         client_id: config.clientId,
         redirect_uri: redirectUri,
         response_type: 'code',
         scope: config.scope.join(scopeSeparator),
         state,
       })
       if (opts.pkce && codeChallenge && codeChallengeMethod) {
         params.append('code_challenge', codeChallenge)
         params.append('code_challenge_method', codeChallengeMethod)
       }
       return `${config.authUrl}?${params.toString()}`
    },
    exchangeCodeForToken: async ({ code, redirectUri, codeVerifier }):Promise<OAuthTokenResponse> => {
       const params = new URLSearchParams({
         grant_type: 'authorization_code',
         code,
         redirect_uri: redirectUri,
         client_id: getConfig(type).clientId,
       })

       if(!opts.pkce){
         params.append('client_secret', getConfig(type).clientSecret)
       }
       if(codeVerifier){
         params.append('code_verifier', codeVerifier)
       }

       const data = await requestToken(type, params)

       let accessToken = data.access_token as string
       let seconds = Number(data.expires_in)
       let expiresAt = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString(): null

       // Facebook short-lived user tokens expire in ~1h. Upgrade to a long-lived
       // token so Page tokens derived from it stay usable for publishing.
       if (type === ChannelTypeEnum.FACEBOOK && accessToken) {
         const longLived = await exchangeFacebookLongLivedToken(accessToken)
         if (longLived) {
           accessToken = longLived.accessToken
           expiresAt = longLived.expiresAt
         }
       }

       return {
        accessToken,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
       }
      
    },
    refreshToken: async ({ refreshToken, redirectUri }) => {
      const config = getConfig(type);
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
      })

      if(config.clientSecret){
        params.append('client_secret', config.clientSecret)
      }
      if(redirectUri){
        params.append('redirect_uri', redirectUri)
      }

      const data = await requestToken(type, params)
      
      const seconds = Number(data.expires_in)
      const expiresAt = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString(): null
      
      return {
       accessToken: data.access_token,
       refreshToken: data.refresh_token ?? null,
       expiresAt,
      }
    },
    getProfile: async ({ accessToken }) => {
      const config = getConfig(type);
      let profileData: Record<string, any> | null = null;

      const response = await fetch(config.profileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      profileData = data?.data ?? data?.user ?? data ?? null

      // LinkedIn OIDC `sub` is NOT the member id used to build a `urn:li:person:{id}`
      // author URN. Fetch the real member id (and vanity name) from /v2/me, which
      // requires the `r_liteprofile` scope, and prefer it over the OIDC identifier.
      let linkedInMemberId: string | null = null
      let linkedInVanityName: string | null = null
      let linkedInPublicProfileUrl: string | null = null

      if (type === ChannelTypeEnum.LINKEDIN) {
        const linkedinProfileResponse = await fetch(
          "https://api.linkedin.com/v2/me?projection=(id,vanityName,publicProfileUrl,profilePicture(displayImage~:playableStreams),firstName,lastName)",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
              'Linkedin-Version': '202604',
            },
          }
        )

        if (linkedinProfileResponse.ok) {
          const linkedInProfileData = await linkedinProfileResponse.json()
          profileData = {
            ...profileData,
            ...linkedInProfileData,
          }
          linkedInMemberId = linkedInProfileData?.id ?? null
          linkedInVanityName = linkedInProfileData?.vanityName ?? null
          linkedInPublicProfileUrl = linkedInProfileData?.publicProfileUrl ?? null
        }
      }

      // Facebook publishing requires a Page, not the personal profile. Fetch
      // managed Pages and store the Page id + Page access token.
      if (type === ChannelTypeEnum.FACEBOOK) {
        const pagesUrl =
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture{url}&access_token=${encodeURIComponent(accessToken)}`
        const pagesResponse = await fetch(pagesUrl, {
          headers: { Accept: "application/json" },
        })
        const pagesData = await pagesResponse.json()

        if (!pagesResponse.ok || pagesData?.error) {
          const message =
            pagesData?.error?.message ||
            `Impossible de lister les pages Facebook (HTTP ${pagesResponse.status}).`
          throw new Error(message)
        }

        const pages: any[] = Array.isArray(pagesData?.data) ? pagesData.data : []
        if (pages.length === 0) {
          throw new Error(
            "Aucune Page Facebook trouvée. Créez une Page (ou utilisez un compte admin d'une Page), puis reconnectez Facebook.",
          )
        }

        // Prefer the first page that has a usable page access token.
        const page = pages.find((p) => p?.access_token) ?? pages[0]
        if (!page?.id || !page?.access_token) {
          throw new Error(
            "La Page Facebook n'a pas renvoyé de jeton d'accès. Vérifiez les permissions pages_show_list / pages_manage_posts dans Meta.",
          )
        }

        return {
          providerAccountId: page.id,
          handle: page.name ?? null,
          profileUrl: `https://facebook.com/${page.id}`,
          profileImage: page?.picture?.data?.url ?? null,
          accessToken: page.access_token,
        }
      }

      if (type === ChannelTypeEnum.INSTAGRAM) {
        const instagramBusinessAccountResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account{username,id,profile_picture_url}&access_token=${encodeURIComponent(accessToken)}`,
          { headers: { Accept: "application/json" } }
        )

        if (instagramBusinessAccountResponse.ok) {
          const businessAccountPayload = await instagramBusinessAccountResponse.json().catch(() => null)
          const instagramBusinessAccount = Array.isArray(businessAccountPayload?.data)
            ? businessAccountPayload.data
                .map((page: any) => page?.instagram_business_account)
                .find((account: any) => account?.id)
            : null

          if (instagramBusinessAccount?.id) {
            const businessHandle = instagramBusinessAccount.username ?? profileData?.username ?? null
            return {
              providerAccountId: instagramBusinessAccount.id,
              handle: businessHandle,
              profileUrl: businessHandle ? `https://instagram.com/${businessHandle}` : null,
              profileImage: instagramBusinessAccount.profile_picture_url ?? profileData?.profile_picture_url ?? profileData?.profile_image_url ?? null,
            }
          }
        }
      }

      // For LinkedIn, the real member id is the only valid author identifier, but
      // /v2/me requires the `r_liteprofile` scope which may not be authorized yet.
      // Fall back to the OIDC `sub` so the connection is never left empty while
      // the app still records the best identifier it has.
      const providerAccountId = type === ChannelTypeEnum.LINKEDIN
        ? (linkedInMemberId ?? profileData?.id ?? profileData?.sub ?? null)
        : (profileData?.id ?? profileData?.sub ?? profileData?.user_id ?? null);

      const vanityName = linkedInVanityName ?? profileData?.vanityName ?? profileData?.username ?? profileData?.screen_name ?? profileData?.handle ?? null;
      const profileUrl = linkedInPublicProfileUrl ?? profileData?.publicProfileUrl ?? profileData?.profile_url ?? profileData?.profileUrl ?? profileData?.public_profile_url ?? profileData?.url ?? profileData?.link ?? profileData?.website ?? profileData?.linkedin_url ?? (vanityName ? `https://www.linkedin.com/in/${vanityName}` : null);
      const handle = vanityName ?? profileData?.name ?? null;
      const profileImage = profileData?.thread_profile_picture ?? profileData?.profile_image_url ?? profileData?.avatar_url ?? profileData?.profile_image ?? profileData?.picture?.data?.url ?? profileData?.picture?.url ?? profileData?.picture ?? null

      console.log(providerAccountId, handle, profileUrl, "providerAccountId")

      return {
        providerAccountId,
        handle,
        profileUrl,
        profileImage,
      }
    },
   }
}


// TikTok's OAuth implementation differs from standard OAuth providers:
// - the authorization URL uses `client_key` instead of `client_id`
// - the token endpoint also expects `client_key` + `client_secret`
// - the profile endpoint returns `data.user.open_id` as the account id
function createTikTokProvider(): OAuthProvider {
  return {
    type: ChannelTypeEnum.TIKTOK,
    getAuthorizationUrl: ({ state, redirectUri, codeChallenge, codeChallengeMethod }) => {
      const config = getConfig(ChannelTypeEnum.TIKTOK)
      const params = new URLSearchParams({
        client_key: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope.join(','),
        state,
      })
      if (codeChallenge && codeChallengeMethod) {
        params.append('code_challenge', codeChallenge)
        params.append('code_challenge_method', codeChallengeMethod)
      }
      return `${config.authUrl}?${params.toString()}`
    },
    exchangeCodeForToken: async ({ code, redirectUri, codeVerifier }) => {
      const config = getConfig(ChannelTypeEnum.TIKTOK)
      const params = new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
      if (codeVerifier) params.append('code_verifier', codeVerifier)

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const data = await parseTokenResponse(response)
      const seconds = Number(data.expires_in)
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null,
      }
    },
    refreshToken: async ({ refreshToken }) => {
      const config = getConfig(ChannelTypeEnum.TIKTOK)
      const params = new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const data = await parseTokenResponse(response)
      const seconds = Number(data.expires_in)
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null,
      }
    },
    getProfile: async ({ accessToken }) => {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!response.ok) throw new Error('Failed to fetch TikTok profile')
      const data = await response.json()
      const user = data?.data?.user ?? data?.data ?? {}
      const openId = user?.open_id ?? user?.union_id ?? null
      const displayName = user?.display_name ?? null
      return {
        providerAccountId: openId,
        handle: displayName,
        profileUrl: displayName ? `https://www.tiktok.com/@${displayName}` : null,
        profileImage: user?.avatar_url ?? null,
      }
    },
  }
}


const PROVIDERS: Record<ChannelTypeEnum, any> = {
    [ChannelTypeEnum.TWITTER]: createProvider(ChannelTypeEnum.TWITTER,{ pkce: true }),
    [ChannelTypeEnum.LINKEDIN]: createProvider(ChannelTypeEnum.LINKEDIN),
    [ChannelTypeEnum.INSTAGRAM]: createProvider(ChannelTypeEnum.INSTAGRAM),
    [ChannelTypeEnum.FACEBOOK]: createProvider(ChannelTypeEnum.FACEBOOK),
    [ChannelTypeEnum.THREADS]: createProvider(ChannelTypeEnum.THREADS),
    [ChannelTypeEnum.BLUESKY]: createProvider(ChannelTypeEnum.BLUESKY),
    [ChannelTypeEnum.YOUTUBE]: createProvider(ChannelTypeEnum.YOUTUBE),
    [ChannelTypeEnum.TIKTOK]: createTikTokProvider(),
}

export function getOAuthProvider(type:ChannelTypeEnum) {
   return PROVIDERS[type];
}

export async function refreshOauthToken(
  type:ChannelTypeEnum,
  refreshToken:string,
  redirectUri:string,
){
  console.log("refreshing token", type, refreshToken, redirectUri)
  const provider = getOAuthProvider(type);
  if(!provider.refreshToken){
    throw new Error('Refresh token not supported for this provider');
  }
  const result = await provider.refreshToken({refreshToken, redirectUri});
  return result;
}

/**
 * Builds the OAuth redirect URI used in BOTH the authorization request and the
 * token exchange. It MUST exactly match the value registered in each provider's
 * developer dashboard — otherwise the provider rejects the flow with:
 * "The redirect_uri does not match the registered value".
 *
 * In production the canonical NEXT_PUBLIC_APP_URL is always preferred so the
 * redirect_uri stays stable and exactly matches the value registered at each
 * provider (a request can arrive on a preview/tunnel host, but providers
 * reject mismatches). In development the request origin is preferred so the
 * flow keeps working behind a tunnel or a custom domain.
 */
/**
 * Builds the OAuth redirect URI used in BOTH the authorization request and the
 * token exchange. It MUST exactly match the value registered in each provider's
 * developer dashboard — otherwise the provider rejects the flow with:
 * "The redirect_uri does not match the registered value".
 *
 * In production the canonical NEXT_PUBLIC_APP_URL is always preferred so the
 * redirect_uri stays stable and exactly matches the value registered at each
 * provider (a request can arrive on a preview/tunnel host, but providers
 * reject mismatches). In development the request origin is preferred so the
 * flow keeps working behind a tunnel or a custom domain.
 */
export function buildOAuthRedirectUri(
  appUrl: string | undefined | null,
  requestOrigin?: string | null,
) {
  const isProduction = process.env.NODE_ENV === "production"
  const base = (
    isProduction ? appUrl || requestOrigin : requestOrigin || appUrl || ""
  ).replace(/\/+$/, "")
  return `${base}/api/channel/callback`
}

/**
 * Resolve the real browser origin behind a reverse proxy / tunnel (cloudflared,
 * ngrok, Vercel, ...). `request.nextUrl.origin` can report `http://` even when
 * the user is on `https://` because Next.js dev does not always trust the
 * forwarded headers, which then makes the OAuth redirect_uri mismatch the one
 * registered at the provider ("Invalid redirect_uri").
 */
export function getRequestOrigin(request: {
  headers: { get(name: string): string | null }
}): string {
  const proto = request.headers.get("x-forwarded-proto") || "http"
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  if (!host) return ""
  return `${proto}://${host}`
}

/**
 * Instagram & Threads require an HTTPS redirect_uri (Meta rejects `http://`
 * and localhost). OAUTH_HTTPS_REDIRECT_URL is a LOCAL-DEV ONLY override: when
 * set, and only outside production, the provider callback for these platforms
 * goes through that public tunnel/domain while the rest of the app stays on
 * localhost. In production it is ignored so the stable NEXT_PUBLIC_APP_URL
 * domain is always used — which is what all end users will browse.
 */
export function buildProviderRedirectUri(
  type: ChannelTypeEnum,
  origin?: string | null,
) {
  const forced = process.env.OAUTH_HTTPS_REDIRECT_URL
  if (
    forced &&
    process.env.NODE_ENV !== "production" &&
    (type === ChannelTypeEnum.INSTAGRAM || type === ChannelTypeEnum.THREADS)
  ) {
    return `${forced.replace(/\/+$/, "")}/api/channel/callback`
  }
  return buildOAuthRedirectUri(process.env.NEXT_PUBLIC_APP_URL, origin)
}
