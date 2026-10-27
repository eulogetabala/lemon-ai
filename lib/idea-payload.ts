export type IdeaPayloadInput = {
  id?: string
  title?: string
  description?: string
  groupId?: string | null
  columnId?: string | null
  images?: unknown[] | null
  sortOrder?: number | null
}

export type NormalizedIdeaPayload = {
  id?: string
  title: string
  description: string
  groupId: string
  images: unknown[]
  sortOrder: number
}

export function normalizeIdeaPayload(input: IdeaPayloadInput): NormalizedIdeaPayload {
  const groupIdCandidate = [input.groupId, input.columnId].find((value) => {
    if (typeof value === "string") return value.trim().length > 0
    return !!value
  }) ?? ""

  const groupId = typeof groupIdCandidate === "string" ? groupIdCandidate.trim() : String(groupIdCandidate ?? "").trim()
  const title = typeof input.title === "string" ? input.title.trim() : ""
  const description = typeof input.description === "string" ? input.description.trim() : ""
  const images = Array.isArray(input.images) ? input.images : []
  const sortOrder = typeof input.sortOrder === "number" ? input.sortOrder : 0

  return {
    id: input.id,
    title,
    description,
    groupId,
    images,
    sortOrder,
  }
}

export function validateIdeaPayload(input: IdeaPayloadInput) {
  const payload = normalizeIdeaPayload(input)

  if (!payload.title || !payload.groupId) {
    return {
      ok: false,
      errors: ["Missing required fields"],
      payload,
    }
  }

  return {
    ok: true,
    errors: [],
    payload,
  }
}
