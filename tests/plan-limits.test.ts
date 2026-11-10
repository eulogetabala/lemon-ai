import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_CONFIGS,
  getPlanFromClerkHas,
  resolvePlanFromMetadata,
  getCheckoutAmountFCFA,
} from "../lib/plan-limits.ts";
import {
  checkChannelConnectLimit,
  checkMonthlyPostsLimit,
} from "../lib/plan-limits-server.ts";

test("PLAN_CONFIGS holds strict quotas for all plans in FCFA", () => {
  assert.equal(PLAN_CONFIGS.free.name, "Gratuit");
  assert.equal(PLAN_CONFIGS.free.monthlyPriceFCFA, 0);
  assert.equal(PLAN_CONFIGS.free.maxConnectedChannels, 1);
  assert.equal(PLAN_CONFIGS.free.maxCompetitors, 1);
  assert.equal(PLAN_CONFIGS.free.maxScheduledPostsPerMonth, 10);
  assert.equal(PLAN_CONFIGS.free.maxWorkspaces, 1);
  assert.equal(PLAN_CONFIGS.free.allowAIGeneration, false);
  assert.equal(PLAN_CONFIGS.free.allowTeamCollaboration, false);

  assert.equal(PLAN_CONFIGS.pro.name, "Pro");
  assert.equal(PLAN_CONFIGS.pro.monthlyPriceFCFA, 12000);
  assert.equal(PLAN_CONFIGS.pro.yearlyPriceFCFA, 9600);
  assert.equal(PLAN_CONFIGS.pro.maxConnectedChannels, Infinity);
  assert.equal(PLAN_CONFIGS.pro.maxScheduledPostsPerMonth, Infinity);
  assert.equal(PLAN_CONFIGS.pro.maxWorkspaces, 5);
  assert.equal(PLAN_CONFIGS.pro.allowAIGeneration, true);
  assert.equal(PLAN_CONFIGS.pro.allowTeamCollaboration, false);

  assert.equal(PLAN_CONFIGS.team.name, "Équipe");
  assert.equal(PLAN_CONFIGS.team.monthlyPriceFCFA, 30000);
  assert.equal(PLAN_CONFIGS.team.yearlyPriceFCFA, 24000);
  assert.equal(PLAN_CONFIGS.team.maxWorkspaces, Infinity);
  assert.equal(PLAN_CONFIGS.team.allowTeamCollaboration, true);

  assert.equal(PLAN_CONFIGS.enterprise.name, "Entreprise");
  assert.equal(PLAN_CONFIGS.enterprise.monthlyPriceFCFA, null);
  assert.equal(PLAN_CONFIGS.enterprise.maxWorkspaces, Infinity);
});

test("resolvePlanFromMetadata respects expiry", () => {
  assert.equal(resolvePlanFromMetadata(null), "free");
  assert.equal(resolvePlanFromMetadata({ plan: "pro" }), "pro");
  assert.equal(resolvePlanFromMetadata({ plan: "team" }), "team");
  assert.equal(
    resolvePlanFromMetadata({
      plan: "pro",
      planExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    }),
    "free"
  );
  assert.equal(
    resolvePlanFromMetadata({
      plan: "pro",
      planExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }),
    "pro"
  );
});

test("getCheckoutAmountFCFA computes monthly and yearly totals", () => {
  assert.equal(getCheckoutAmountFCFA("pro", "monthly"), 12000);
  assert.equal(getCheckoutAmountFCFA("pro", "yearly"), 9600 * 12);
  assert.equal(getCheckoutAmountFCFA("team", "monthly"), 30000);
  assert.equal(getCheckoutAmountFCFA("enterprise", "monthly"), null);
});

test("getPlanFromClerkHas correctly extracts plan tier or defaults to free", () => {
  assert.equal(getPlanFromClerkHas(null), "free");
  assert.equal(getPlanFromClerkHas(undefined), "free");
  assert.equal(getPlanFromClerkHas(() => false), "free");

  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "pro"), "pro");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "premium"), "pro");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "team"), "team");
  assert.equal(getPlanFromClerkHas(({ plan }: { plan: string }) => plan === "enterprise"), "enterprise");
  assert.equal(getPlanFromClerkHas(null, { plan: "pro" }), "pro");
});

test("checkChannelConnectLimit strictly limits Free plan to 1 channel", async () => {
  const mockSupabaseCount0 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count: 0, error: null }),
        }),
      }),
    }),
  };

  const res1 = await checkChannelConnectLimit(mockSupabaseCount0, "user_123", "free");
  assert.equal(res1.allowed, true);
  assert.equal(res1.currentCount, 0);
  assert.equal(res1.maxCount, 1);

  const mockSupabaseCount1 = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count: 1, error: null }),
        }),
      }),
    }),
  };

  const res2 = await checkChannelConnectLimit(mockSupabaseCount1, "user_123", "free");
  assert.equal(res2.allowed, false);
  assert.equal(res2.currentCount, 1);
  assert.match(res2.message || "", /limité à 1 canal connecté/);

  const resPro = await checkChannelConnectLimit(mockSupabaseCount1, "user_123", "pro");
  assert.equal(resPro.allowed, true);
});

test("checkMonthlyPostsLimit strictly enforces 10 posts per month on Free plan", async () => {
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

  const resPro = await checkMonthlyPostsLimit(mockSupabase10, "user_123", "pro", 5);
  assert.equal(resPro.allowed, true);
});
