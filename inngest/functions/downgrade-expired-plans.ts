import { inngest } from "../client";
import { clerkClient } from "@clerk/nextjs/server";

export const downgradeExpiredPlansCron = inngest.createFunction(
  {
    id: "downgrade-expired-plans-cron",
    name: "Vérifier et rétrograder les forfaits expirés",
    triggers: [
      {
        cron: "0 2 * * *", // Chaque nuit à 2h00
      },
    ],
  },
  async ({ step, logger }) => {
    const result = await step.run("check-and-downgrade-expired-plans", async () => {
      const client = await clerkClient();
      const usersResponse = await client.users.getUserList({ limit: 500 });
      const users = usersResponse.data || [];

      let downgradedCount = 0;
      const now = Date.now();

      for (const user of users) {
        const meta = (user.publicMetadata || {}) as Record<string, any>;
        const plan = meta.plan;
        const planExpiresAt = meta.planExpiresAt;

        // Skip users already on free or without expiration (e.g. lifetime enterprise)
        if (!plan || plan === "free" || !planExpiresAt) {
          continue;
        }

        const expiresTime = Date.parse(planExpiresAt);
        if (!isNaN(expiresTime) && expiresTime < now) {
          // Plan is expired -> downgrade to free
          await client.users.updateUser(user.id, {
            publicMetadata: {
              ...meta,
              plan: "free",
              tier: "free",
              is_premium: false,
              planDowngradedAt: new Date().toISOString(),
              previousPlan: plan,
            },
          });
          downgradedCount++;
          logger.info(`[inngest] Downgraded user ${user.id} from ${plan} to free (expired ${planExpiresAt})`);
        }
      }

      return {
        totalChecked: users.length,
        downgradedCount,
      };
    });

    return result;
  }
);
