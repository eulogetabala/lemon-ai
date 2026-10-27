export const POST_STATUS = {
  DRAFT: "draft",
  QUEUE: "queue",
  PUBLISHED: "published",
  FAILED: "failed"
} as const;

export const PUBLISH_STATUS = {
  PENDING: "pending",
  PUBLISHED: "published",
  FAILED: "failed",
  PARTIAL: "partial",
} as const;

export const VISIBILITY_STATUS = {
  UNKNOWN: "unknown",
  VISIBLE: "visible",
  HIDDEN: "hidden",
} as const;

export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];
export type PublishStatus = typeof PUBLISH_STATUS[keyof typeof PUBLISH_STATUS];
export type VisibilityStatus = typeof VISIBILITY_STATUS[keyof typeof VISIBILITY_STATUS];

export const POST_STATUSES = Object.values(POST_STATUS);
