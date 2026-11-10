import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { publishScheduledPost, publishScheduledPostsCron } from "@/inngest/functions/publish-scheduled-posts";
import { downgradeExpiredPlansCron } from "@/inngest/functions/downgrade-expired-plans";
import { syncCompetitorsCron } from "@/inngest/functions/sync-competitors-posts";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    publishScheduledPostsCron,
    publishScheduledPost,
    downgradeExpiredPlansCron,
    syncCompetitorsCron,
  ],
});