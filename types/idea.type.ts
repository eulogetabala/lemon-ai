import { ImageObject } from "./post.type"


export type IdeaType = {
    id?: string
    title: string
    description?: string
    tags?: string[]
    images?: ImageObject[]
    groupId?: string
    columnId?: string
    sortOrder?: number
}
