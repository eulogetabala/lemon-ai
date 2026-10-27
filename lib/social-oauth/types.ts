import { ChannelTypeEnum } from "@/constants/channels"

export type OAuthConnectionProfile = {
    providerAccountId?: string | null
    handle?: string;
    profileUrl?: string | null
    profileImage?: string | null
    // Optional token override to store instead of the OAuth token.
    // Used by Facebook, where the page access token (not the user token)
    // is required to publish content.
    accessToken?: string | null
}

export type OAuthTokenResponse = {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
}

export type OAuthProvider = {
    type: ChannelTypeEnum
    getAuthorizationUrl: (params:{
        state:string;
        redirectUri:string;
        codeChallenge?:string;
        codeChallengeMethod?:string;
    }) => string
    exchangeCodeForToken: (params:{
        code:string;
        redirectUri:string;
        codeVerifier?:string;
    }) => Promise<OAuthTokenResponse>
    refreshToken: (params: {
        refreshToken:string;
        redirectUri?:string;
    }) => Promise<OAuthTokenResponse>
    getProfile: (params: {
        accessToken:string;
    }) => Promise<OAuthConnectionProfile>
}