import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { inngest } from "../client";
import { ImageObject, PostType } from "@/types/post.type";
import { decrypt, encrypt } from "@/lib/encryption";
import { normalizeSocialPostText } from "@/lib/rich-text";
import { refreshOauthToken } from "@/lib/social-oauth";
import { ChannelTypeEnum } from "@/constants/channels";
import { getMediaPublishingStrategy, resolveLinkedInAuthorUrn, validatePlatformPublishingTarget } from "@/lib/social-publishing";


type DuePost = {
    id:string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export const publishScheduledPostsCron = inngest.createFunction(
    {
        id:"publish-scheduled-posts-cron",
        name:"Publish Scheduled Posts",
        triggers:[
            {
                cron:"*/10 * * * *"
            }
        ]
    },
    async ({step,logger}) => {

        const duePosts = await step.run("load-due-scheduled-posts", async () => {
            const supabase = getSupabaseAdminClient()
            const now = new Date().toISOString()
            const { data, error } = await supabase
                .from("scheduled_posts")
                .select("id, status, scheduled_at")
                .eq("status", "queue")
                .lte("scheduled_at", now)
                .order("scheduled_at", { ascending: true })

            logger.info("Load due scheduled posts", { count: data?.length })

            if(error){
                logger.error(error)
                throw error
            }
            return (data ?? []) as DuePost[]
        })

        if(duePosts.length === 0){
            return { queued: 0}
        }
        logger.info("Send out the post for publish", { count: duePosts.length })

        await step.sendEvent(
            "send-out-post-for-publish",
            duePosts.map(post => ({
                name:"post/publish.requested",
                data: {
                    postId: post.id
                }
            }))
        )

        return { message:"sent out posts for publishing", queued: duePosts.length}
    }
)

export const publishScheduledPost = inngest.createFunction(
    {
        id:"publish-scheduled-post",
        name:"Publish Scheduled Post",
        triggers:{
            event:"post/publish.requested"
        }
    },
    async ({event, step,logger}) => {
       const post = await step.run("load-post", async () => {
        const supabase = getSupabaseAdminClient()
        const { data, error } = await supabase
            .from("scheduled_posts")
            .select("*, user_channels(*, channel_types(id, type, name))")
            .eq("id", event.data.postId)
            .eq("status", "queue")
            .single()

        logger.info("Load post", { data })
        if(error){
            logger.error(error)
            throw error
        }
        
        return data as PostType;
       })

       if(!post){
        logger.error("Post not found", { postId: event.data.postId })
        return { skipped: true, reason: "post_not_found" }
       }

       const userChannel = post.user_channels
       if(!userChannel) return {skipped: true, reason: "user_channel_not_found"}

       const channelType = userChannel.channel_types
       if(!channelType) return {skipped: true, reason: "channel_type_not_found"}
       

       // DB stores lowercase type ('linkedin'), enum expects uppercase ('LINKEDIN').
       const providerType = (post.user_channels?.channel_types?.type ?? "").toUpperCase();
       const accessToken = decrypt(post.user_channels?.access_token)
       const refreshToken = decrypt(post.user_channels?.refresh_token);
       const tokenExpiresAt = post.user_channels?.token_expires_at ? 
            new Date(post.user_channels.token_expires_at).getTime() : null;
        const callbackUrl = `${APP_URL}/api/channel/callback`;
        const shouldRefreshBeforePublish = Boolean(refreshToken) &&
            tokenExpiresAt !== null &&
            tokenExpiresAt <= Date.now()

        if(!providerType || !accessToken){
            logger.error("Missing provider type or access token", { providerType, accessToken })
            return { skipped: true, reason: "missing_provider_or_token" }
        }

        let currentAccessToken = accessToken;

        if(shouldRefreshBeforePublish && refreshToken){
            const result = await step.run("refresh-token", async () => {
                const data = await refreshOauthToken(
                    providerType as ChannelTypeEnum,
                    refreshToken,
                    callbackUrl
                )
                await saveRefreshedToken(post.user_channels?.id, 
                    data.accessToken,
                    data.refreshToken ?? refreshToken,
                    data.expiresAt
                )
                return data;
            })
            currentAccessToken = result.accessToken;
        }

        const publishTarget = validatePlatformPublishingTarget(
            providerType,
            post.user_channels?.provider_account_id,
            post.user_channels?.profile_url,
            post.user_channels?.handle,
        )

        if (!publishTarget.ok) {
            logger.error("Publish target validation failed", { providerType, error: publishTarget.error })
            await step.run("mark-post-failed-validation", async () => {
                await markPostFailed(post.id, publishTarget.error)
            })
            return { skipped: true, reason: "invalid_publish_target" }
        }

        const publishResult = await step.run("publish-to-provider", async () => {
            try {
                let publishedUrl: string | null = null
                const mediaStrategy = getMediaPublishingStrategy(providerType)
                const firstImage = post.images?.[0]?.url ?? null
                const socialText = normalizeSocialPostText(post.content || "")

                if (providerType === ChannelTypeEnum.TWITTER) {
                    publishedUrl = await publishToTwitter({
                        accessToken: currentAccessToken,
                        content: socialText,
                        handle: post.user_channels?.handle,
                        images: post.images,
                        logger
                    });
                } else if (providerType === ChannelTypeEnum.LINKEDIN) {
                    publishedUrl = await publishToLinkedIn({
                        accessToken: currentAccessToken,
                        text: socialText,
                        authorId: post.user_channels?.provider_account_id,
                        profileUrl: post.user_channels?.profile_url,
                        images: mediaStrategy.supportsMedia && firstImage ? post.images?.slice(0, 1) : [],
                        logger
                    });
                } else if (providerType === ChannelTypeEnum.FACEBOOK) {
                    publishedUrl = await publishToFacebook({
                        accessToken: currentAccessToken,
                        pageId: post.user_channels?.provider_account_id,
                        message: socialText,
                        images: mediaStrategy.supportsMedia && firstImage ? post.images?.slice(0, 1) : [],
                        logger
                    });
                } else if (providerType === ChannelTypeEnum.INSTAGRAM) {
                    publishedUrl = await publishToInstagram({
                        accessToken: currentAccessToken,
                        accountId: post.user_channels?.provider_account_id,
                        caption: socialText,
                        images: mediaStrategy.supportsMedia && firstImage ? post.images?.slice(0, 1) : [],
                        logger
                    });
                } else {
                    return { ok: false as const, error: `Unsupported provider type: ${providerType}` }
                }
                return { ok: true as const, publishedUrl }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error"
                logger.error("Provider publish failed", { providerType, message })
                return { ok: false as const, error: message }
            }
        })

        if (!publishResult.ok) {
            await step.run("mark-post-failed-provider", async () => {
                await markPostFailed(
                    post.id,
                    publishResult.error,
                    publishTarget.ownerType,
                    publishTarget.ownerId,
                    { provider: providerType, ownerLabel: publishTarget.ownerLabel }
                )
            })
            return { published: false, provider: providerType, error: publishResult.error }
        }

        await step.run("mark-post-published", async () => {
            await markPostPublished(
                post.id,
                publishResult.publishedUrl,
                publishTarget.ownerType,
                publishTarget.ownerId,
                { provider: providerType, ownerLabel: publishTarget.ownerLabel }
            );
        })

        return { published: true, provider: providerType, ownerType: publishTarget.ownerType, ownerId: publishTarget.ownerId }
    }
)



async function publishToTwitter({
    accessToken,
    content,
    handle,
    images,
    logger
}: {
    accessToken: string;
    content: string;
    handle?: string | null;
    images?: ImageObject[]
    logger: any;
}){
    const mediaIds = images?.length ? 
    await uploadImagesToTwitter({
        accessToken,
        images,
        logger
    }) : [];

    const response = await fetch("https://api.x.com/2/tweets",{
        method:"POST",
        headers:{
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: content,
             ...(mediaIds.length > 0 ? { 
                media: { 
                    media_ids: mediaIds 
                } 
            } : {})
        })
    })

    if(!response.ok) throw new Error("Failed to publish to Twitter")

    const responseText = await response.text()
    let data:any = null;
    try {
        data = JSON.parse(responseText)
    } catch (error) {
        logger.error("Failed to parse Twitter response", { error, responseText })
        data = null
    }

    const postId = data?.data?.id;

    if(!postId) throw new Error("Failed to get post ID from Twitter response")
    
    return handle ? `https://x.com/${handle}/status/${postId}` : null;   
}


async function uploadImagesToTwitter({
    accessToken,
    images,
    logger
}: {
    accessToken: string;
    images: ImageObject[];
    logger: any;
}){
   const mediaIds:string[] = [];

   for(const image of images){
    const fileResponse = await fetch(image.url);
    if(!fileResponse.ok) throw new Error("Failed to fetch image");

    const bytes = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get("content-type")?.split(";")[0].trim();

    const pathname = new URL(image.url).pathname.toLowerCase();

    const mediaType = 
        contentType && 
        contentType != "binary/octet-stream" && 
        contentType != "application/octet-stream" ? contentType :
        pathname.endsWith(".png") ? "image/png" :
        pathname.endsWith(".webp") ? "image/webp" :
        "image/jpeg"

        const formData = new FormData();
        const blob = new Blob([bytes], {type: mediaType});
        formData.append("media", blob);
        formData.append("media_category", "tweet_image");
        formData.append("media_type", mediaType);

        const uploadRes = await fetch("https://api.x.com/2/media/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            },
            body: formData
        })

        
        const response = await uploadRes.text();
        logger.info("Twitter media upload response", { response });
        let data:any = null;
        try {
            data = JSON.parse(response);
        } catch (e) {
            logger.error("Failed to parse Twitter media upload response", { response });
            data = null
        }
        
        if(!uploadRes.ok) {
            throw new Error(`Failed to upload media to Twitter: ${response}`)
        }
       
        const mediaId = data?.data?.id || data?.data?.media_key
       if(!mediaId) throw new Error("Failed to get media ID from Twitter response")
       mediaIds.push(mediaId)
   }
   return mediaIds
}



async function publishToInstagram({
  accessToken,
  accountId,
  caption,
  images,
  logger,
}: {
  accessToken: string
  accountId?: string | null
  caption: string
  images?: { url: string; key: string }[]
  logger: any
}) {
  if (!accountId) {
    throw new Error("Instagram business account identifier is missing.")
  }

  const firstImage = images?.[0]?.url ?? null
  if (!firstImage) {
    throw new Error("Instagram publishing requires at least one image.")
  }

  const createResponse = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      image_url: firstImage,
      caption,
      media_type: "IMAGE",
    }).toString(),
  })

  const createText = await createResponse.text()
  let createData: any = null
  try {
    createData = createText ? JSON.parse(createText) : null
  } catch {
    logger.error("Failed to parse Instagram media-creation response", { createText })
  }

  if (!createResponse.ok) {
    throw new Error(createData?.error?.message || "Failed to create Instagram media container.")
  }

  const creationId = createData?.id ?? null
  if (!creationId) {
    throw new Error("Instagram media creation did not return an ID.")
  }

  const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      creation_id: creationId,
    }).toString(),
  })

  const publishText = await publishResponse.text()
  let publishData: any = null
  try {
    publishData = publishText ? JSON.parse(publishText) : null
  } catch {
    logger.error("Failed to parse Instagram publish response", { publishText })
  }

  if (!publishResponse.ok) {
    throw new Error(publishData?.error?.message || "Failed to publish to Instagram.")
  }

  return publishData?.id ? `https://www.instagram.com/p/${publishData.id}` : null
}

async function publishToFacebook({
  accessToken,
  pageId,
  message,
  images,
  logger,
}: {
  accessToken: string
  pageId?: string | null
  message: string
  images?: { url: string; key: string }[]
  logger: any
}) {
  if (!pageId) {
    throw new Error("Facebook page identifier is missing.")
  }

  const firstImage = images?.[0]?.url ?? null

  // Posting a photo requires the /photos endpoint with a hosted image URL.
  // Otherwise a plain text post goes to /feed.
  const endpoint = firstImage
    ? `https://graph.facebook.com/v19.0/${pageId}/photos`
    : `https://graph.facebook.com/v19.0/${pageId}/feed`

  const params = new URLSearchParams({
    access_token: accessToken,
    message,
  })
  if (firstImage) {
    params.append("url", firstImage)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  const responseText = await response.text()
  let data: any = null
  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    logger.error("Failed to parse Facebook publish response", { responseText })
  }

  logger.info("Facebook publish response", {
    status: response.status,
    statusText: response.statusText,
    body: data ?? responseText,
  })

  if (!response.ok) {
    throw new Error(data?.error?.message || `Failed to publish to Facebook (HTTP ${response.status}).`)
  }

  const postId = data?.post_id ?? data?.id ?? null
  return postId ? `https://www.facebook.com/${postId}` : null
}



async function publishToLinkedIn({
  accessToken,
  text,
  authorId,
  profileUrl,
  images,
  logger,

}: {
  accessToken: string
  text: string
  authorId?: string | null
  profileUrl?: string | null
  images?: { url: string; key: string }[]
  logger: any
}) {
  const authorResolution = resolveLinkedInAuthorUrn(authorId, profileUrl, "auto")
  if (!authorResolution.ok) {
    throw new Error(authorResolution.error)
  }

  const ownerUrn = authorResolution.urn
  logger.info("Publishing to LinkedIn with author URN", { ownerUrn, kind: authorResolution.kind })
  const imageUrn = images?.[0]?.url
    ? await uploadLinkedInImage({
      accessToken,
      ownerUrn,
      imageUrl: images[0].url,
    })
    : null
  const body: Record<string, unknown> = {
    author: ownerUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  }

  if (imageUrn) {
    body.content = {
      media: {
        id: imageUrn,
      },
    }
  }
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": "202604",
    },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  let data: any = null
  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    logger.error("Failed to parse LinkedIn response", { responseText })
  }

  logger.info("LinkedIn publish response", {
    status: response.status,
    statusText: response.statusText,
    body: data ?? responseText,
    xRestliId: response.headers.get("x-restli-id"),
  })

  if (!response.ok) {
    throw new Error(data?.message || `Failed to publish to LinkedIn (HTTP ${response.status}).`)
  }
  const restliId = response.headers.get("x-restli-id") || data?.id || null
  return restliId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(restliId)}` : null
}

async function uploadLinkedInImage({
  accessToken,
  ownerUrn,
  imageUrl,
}: {
  accessToken: string
  ownerUrn: string
  imageUrl: string
}) {
  const initResponse = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": "202604",
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
  })
  const initResponseText = await initResponse.text()
  let initData: { message?: string; value?: { uploadUrl?: string; image?: string } } | null = null
  try {
    initData = initResponseText ? JSON.parse(initResponseText) : null
  } catch {
    throw new Error("Failed to parse LinkedIn image initialization response.")
  }

  if (!initResponse.ok) {
    throw new Error(initData?.message || "Failed to initialize LinkedIn image upload.")
  }
  const uploadUrl = initData?.value?.uploadUrl
  const imageUrn = initData?.value?.image
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn image upload initialization did not return an upload URL.")
  }
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image for LinkedIn upload.")
  }
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
  const imageBuffer = await imageResponse.arrayBuffer()
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: imageBuffer,
  })
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image to LinkedIn.")
  }

  return imageUrn as string
}


async function saveRefreshedToken(
    userChannelId: string | undefined,
    accessToken: string,
    refreshToken: string,
    expiresAt: number
) {
    if(!userChannelId) {
        throw new Error("User channel ID is missing")
    };
    const supabase = getSupabaseAdminClient();
    const {error} = await supabase
        .from("user_channels")
        .update({
            access_token: encrypt(accessToken),
            refresh_token: encrypt(refreshToken),
            token_expires_at: expiresAt ?? null
        })
        .eq("id", userChannelId);
    
    if(error) throw error
}

async function markPostPublished(
    postId:string,
    published_url:string | null,
    ownerType?: string,
    ownerId?: string,
    providerResponse?: Record<string, unknown>
){
    const supabase = getSupabaseAdminClient();
    const {error} = await supabase
        .from("scheduled_posts")
        .update({
            status: "published",
            publish_status: "published",
            visibility_status: "unknown",
            provider_owner_type: ownerType ?? null,
            provider_owner_id: ownerId ?? null,
            provider_response: providerResponse ?? {},
            published_at: new Date().toISOString(),
            published_url: published_url
        })
        .eq("id", postId);
    if(error) throw error
}

async function markPostFailed(
    postId:string,
    errorMessage:string,
    ownerType?: string,
    ownerId?: string,
    providerResponse?: Record<string, unknown>
){
    const supabase = getSupabaseAdminClient();
    const {error} = await supabase
        .from("scheduled_posts")
        .update({
            status: "failed",
            publish_status: "failed",
            visibility_status: "hidden",
            provider_owner_type: ownerType ?? null,
            provider_owner_id: ownerId ?? null,
            provider_response: providerResponse ?? {},
            error_message: errorMessage
        })
        .eq("id", postId);
    
    if(error) throw error
}

function formatLinkedInText(text: string): string {
  return text
    // normalize smart quotes to straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/(\d+\.)\s{2}/g, '\n\n$1 ')
    // trim
    .trim()
    .slice(0, 3000)
}