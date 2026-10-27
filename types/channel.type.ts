import { ChannelTypeEnum } from "@/constants/channels"

export type ChannelType = {
    id: string
    type: ChannelTypeEnum
    name?: string
    color: string
    character_limit: number
    connected: boolean
    user_channel_id?: string | null
    handle?: string | null
    profile_image?: string | null
    profile_url?: string | null
}

export type ConnectedAccountType = {
    id: string
    channel_type_id: string
    type: ChannelTypeEnum
    name?: string | null
    color: string
    character_limit: number
    handle?: string | null
    profile_image?: string | null
    profile_url?: string | null
    provider_account_id?: string | null
}

