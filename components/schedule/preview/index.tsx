import { ChannelType, ConnectedAccountType } from "@/types/channel.type"
import { TwitterPreview } from "./twitter-preview"
import { FacebookPreview } from "./facebook-preview"
import { InstagramPreview } from "./instagram-preview"
import { BlueSkyPreview } from "./bluesky-preview"
import { InfoIcon } from "lucide-react"
import { ThreadPreview } from "./thread-preview"
import { LinkedinPreview } from "./linkedin-preview"
import { YoutubePreview } from "./youtube-preview"
import { ImageObject } from "@/types/post.type"
import { ChannelTypeEnum } from "@/constants/channels"
import { stripRichTextFormatting } from "@/lib/rich-text"

type ChannelContent = {
  title?: string
  text: string
  images: ImageObject[]
}

const PreviewPanel = ({
  channel,
  content,
}: {
  channel: ChannelType | ConnectedAccountType | null
  content: ChannelContent
}) =>{
  if (!channel) {
    return (
      <div className="flex flex-1 h-full items-center justify-center text-sm text-muted-foreground">
        Sélectionnez un canal pour l'aperçu
      </div>
    )
  }

  const label = `Aperçu ${channel?.name}`
  const imageUrls = content?.images?.map(img => img.url)
  const displayText = stripRichTextFormatting([content.title, content.text].filter(Boolean).join("\n\n"))

  const renderPreview = () => {
    switch (channel.type) {
      case ChannelTypeEnum.TWITTER:
        return <TwitterPreview
        text={displayText}
        images={imageUrls}
        profileImage={channel?.profile_image || ""}
        handle={channel?.handle || ""}
        />
        case ChannelTypeEnum.LINKEDIN:
          return <LinkedinPreview
            text={displayText}
            images={imageUrls}
            profileImage={channel?.profile_image || ""}
        handle={channel?.handle || ""}
          />
      case ChannelTypeEnum.INSTAGRAM:
        return <InstagramPreview
          text={displayText}
          images={imageUrls}
        />
      case ChannelTypeEnum.THREADS:
        return <ThreadPreview
          text={displayText}
          images={imageUrls}
        />
      case ChannelTypeEnum.FACEBOOK:
        return <FacebookPreview
          text={displayText}
          images={imageUrls}
        />
      case ChannelTypeEnum.BLUESKY:
        return <BlueSkyPreview
          text={displayText}
          images={imageUrls}
        />
      case ChannelTypeEnum.YOUTUBE:
        return <YoutubePreview
          text={displayText}
          images={imageUrls}
        />
      default:
        return <div></div>
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 h-full py-1">
      <div className="flex items-center gap-2 px-7">
        <h3 className="text-sm font-medium">{label}</h3>
        <InfoIcon className="size-4" />
      </div>
      <div className="w-full flex-1 px-7 py-1 overflow-y-auto">
        {renderPreview()}
      </div>
    </div>
  )
}

export default PreviewPanel
