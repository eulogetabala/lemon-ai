import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_CONFIGS,
  getPlanFromClerkHas,
  checkChannelConnectLimit,
  checkMonthlyPostsLimit,
} from "../lib/plan-limits.ts";

test("PLAN_CONFIGS holds strict quotas for all plans in FCFA", () => {
  // Gratuit
  assert.equal(PLAN_CONFIGS.free.name, "Gratuit");
  assert.equal(PLAN_CONFIGS.free.monthlyPriceFCFA, 0);
  assert.equal(PLAN_CONFIGS.free.maxConnectedChannels, 3);
  assert.equal(PLAN_CONFIGS.free.maxScheduledPostsPerMonth, 10);
  assert.equal(PLAN_CONFIGS.free.maxWorkspaces, 1);
  assert.equal(PLAN_CONFIGS.free.allowAIGeneration, false);
  assert.equal(PLAN_CONFIGS.free.allowTeamCollaboration, false);

  // Pro
  assert.equal(PLAN_CONFIGS.pro.name, "Pro");
  assert.equal(PLAN_CONFIGS.pro.monthlyPriceFCFA, 12000);
  assert.equal(PLAN_CONFIGS.pro.yearlyPriceFCFA, 9600);
  assert.equal(PLAN_CONFIGS.pro.maxConnectedChannels, Infinity);
  assert.equal(PLAN_CONFIGS.pro.maxScheduledPostsPerMonth, Infinity);
  assert.equal(PLAN_CONFIGS.pro.maxWorkspaces, 5);
  assert.equal(PLAN_CONFIGS.pro.allowAIGeneration, true);
  assert.equal(PLAN_CONFIGS.pro.allowTeamCollaboration, false);

  // Équipe
  assert.equal(PLAN_CONFIGS.team.name, "Équipe");
  assert.equal(PLAN_CONFIGS.team.monthlyPriceFCFA, 30000);
  assert.equal(PLAN_CONFIGS.team.yearlyPriceFCFA, 24000);
  assert.equal(PLAN_CONFIGS.team.maxConnectedChannels, Infinity);
  assert.equal(PLAN_CONFIGS.team.maxScheduledPostsPerMonth, Infinity);
  assert.equal(PLAN_CONFIGS.team.maxWorkspaces, Infinity);
  assert.equal(PLAN_CONFIGS.team.allowAIGeneration, true);
  assert.equal(PLAN_CONFIGS.team.allowTeamCollaboration, true);

  // Entreprise
  assert.equal(PLAN_CONFIGS.enterprise.name, "Entreprise");
  assert.equal(PLAN_CONFIGS.enterprise.monthlyPriceFCFA, null);
  assert.equal(PLAN_CONFIGS.enterprise.maxConnectedChannels, Infinity);
  assert.equal(PLAN_CONFIGS.enterprise.maxScheduledPostsPerMonth, Infinity);
  assert.equal(PLAN_CONFIGS.enterprise.maxWorkspaces, Infinity);
});

test("getPlanFromClerkHas correctly extracts plan tier or defaults to free", () => {
  assert.equal(getPlanFromClerkHas(null), "free");
  assert.equal(getPlanFromClerkHas(undefined), "free");
  assert.equal(getPlanFromClerkHas(() => false), "free");

  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "pro"), "pro");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "premium"), "pro");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "team"), "team");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "enterprise"), "enterprise");
});

test("checkChannelConnectLimit strictly limits Free plan to 3 channels", async () => {
  // Mock Supabase returning 2 connected channels
  const mockSupabaseCount2 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count: 2, error: null }),
        }),
      }),
    }),
  };

  const res1 = await checkChannelConnectLimit(mockSupabaseCount2, "user_123", "free");
  assert.equal(res1.allowed, true);
  assert.equal(res1.currentCount, 2);
  assert.equal(res1.maxCount, 3);

  // Mock Supabase returning 3 connected channels (limit reached)
  const mockSupabaseCount3 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count: 3, error: null }),
        }),
      }),
    }),
  };

  const res2 = await checkChannelConnectLimit(mockSupabaseCount3, "user_123", "free");
  assert.equal(res2.allowed, false);
  assert.equal(res2.currentCount, 3);
  assert.match(res2.message || "", /limité à 3 canaux connectés/);

  // Pro plan bypasses channel limits
  const resPro = await checkChannelConnectLimit(mockSupabaseCount3, "user_123", "pro");
  assert.equal(resPro.allowed, true);
});

test("checkMonthlyPostsLimit strictly enforces 10 posts per month on Free plan", async () => {
  // 9 posts already scheduled this month, scheduling 1 more -> OK (10 <= 10)
  const mockSupabase9 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: async () => ({ count: 9, error: null }),
          }),
        }),
      }),
    }),
  };

  const res1 = await checkMonthlyPostsLimit(mockSupabase9, "user_123", "free", 1);
  assert.equal(res1.allowed, true);
  assert.equal(res1.currentMonthCount, 9);
  assert.equal(res1.maxCount, 10);

  // 10 posts already scheduled this month, scheduling 1 more -> BLOCKED (11 > 10)
  const mockSupabase10 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: async () => ({ count: 10, error: null }),
          }),
        }),
      }),
    }),
  };

  const res2 = await checkMonthlyPostsLimit(mockSupabase10, "user_123", "free", 1);
  assert.equal(res2.allowed, false);
  assert.equal(res2.currentMonthCount, 10);
  assert.match(res2.message || "", /limité à 10 publications/);

  // Pro plan has unlimited scheduled posts
  const resPro = await checkMonthlyPostsLimit(mockSupabase10, "user_123", "pro", 5);
  assert.equal(resPro.allowed, true);
});
