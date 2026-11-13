import { inngest } from "../client";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { getPlatformCredential, syncCompetitorPlatform } from "@/lib/competitor-sync";
import { isSyncDue } from "@/lib/competitor-sync-schedule";

export const syncCompetitorsCron = inngest.createFunction(
  {
    id: "sync-competitors-cron",
    name: "Synchroniser les posts des concurrents (Veille concurrentielle)",
    triggers: [
      {
        // Tick toutes les 30 minutes ; chaque plateforme est ensuite filtrée par
        // isSyncDue() selon la fréquence de son réseau (voir competitor-sync-schedule).
        cron: "*/30 * * * *",
      },
    ],
  },
  async ({ step, logger }) => {
    const summary = await step.run("sync-all-competitor-platforms", async () => {
      const supabase = getSupabaseAdminClient();

      // Fetch all competitor platforms with owner user_id
      const { data: platforms, error } = await supabase
        .from("competitor_platforms")
        .select("id, platform, handle, profile_url, synced_at, competitor_id, competitors(user_id)");

      if (error) {
        logger.error("Failed to load competitor platforms:", error);
        return { count: 0, error: error.message };
      }

      if (!platforms || platforms.length === 0) {
        return { count: 0, message: "No competitors found." };
      }

      let syncedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const now = Date.now();

      for (const row of platforms) {
        if (!isSyncDue(row, now)) {
          skippedCount++;
          continue;
        }

        try {
          const comp = Array.isArray(row.competitors) ? row.competitors[0] : row.competitors;
          const userId = (comp as any)?.user_id;

          const cred = userId
            ? await getPlatformCredential(supabase, userId, row.platform)
            : null;

          const result = await syncCompetitorPlatform(
            supabase,
            {
              id: row.id,
              platform: row.platform,
              handle: row.handle,
              profile_url: row.profile_url,
            },
            cred
          );

          if (result.ok) {
            syncedCount++;
          } else {
            errorCount++;
          }
        } catch (err: any) {
          errorCount++;
          logger.warn(`Failed to sync platform ${row.id} (${row.platform}):`, err?.message);
        }
      }

      logger.info(
        `Competitor sync completed: ${syncedCount} succeeded, ${errorCount} failed, ${skippedCount} skipped (not due) out of ${platforms.length}`,
      );

      return {
        total: platforms.length,
        syncedCount,
        errorCount,
        skippedCount,
      };
    });

    return summary;
  }
);

