import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { computePlanExpiry, type PlanId, type PlanInterval } from "@/lib/plan-limits";

export type FulfillSubscriptionParams = {
  userId: string;
  planId: PlanId;
  interval: PlanInterval;
  amountFCFA: number;
  externalReference: string;
  checkoutSessionId?: string | null;
  transactionId?: string | null;
  transactionStatus: string;
  metadata?: Record<string, any>;
};

export type FulfillResult = {
  success: boolean;
  message: string;
  plan?: PlanId;
  expiresAt?: string;
};

export async function fulfillSubscription(
  params: FulfillSubscriptionParams
): Promise<FulfillResult> {
  const {
    userId,
    planId,
    interval,
    amountFCFA,
    externalReference,
    checkoutSessionId,
    transactionId,
    transactionStatus,
    metadata,
  } = params;

  const isApproved =
    transactionStatus.toLowerCase() === "approved" ||
    transactionStatus.toLowerCase() === "success" ||
    transactionStatus.toLowerCase() === "completed";

  const supabase = getSupabaseAdminClient();

  if (!isApproved) {
    // Record rejected/pending attempt in payments table
    try {
      await supabase.from("payments").upsert(
        {
          user_id: userId,
          plan_id: planId,
          interval,
          amount_fcfa: amountFCFA,
          currency: "XOF",
          status: transactionStatus.toLowerCase() === "pending" ? "pending" : "rejected",
          external_reference: externalReference,
          checkout_session_id: checkoutSessionId,
          transaction_id: transactionId,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_reference" }
      );
    } catch (e) {
      console.warn("[fulfillSubscription] Failed to log non-approved payment:", e);
    }

    return {
      success: false,
      message: `Paiement non approuvé (statut: ${transactionStatus})`,
    };
  }

  // 1. Fetch current Clerk metadata to extend or set expiry
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentMeta = (user.publicMetadata || {}) as Record<string, any>;

  let baseDate = new Date();
  if (currentMeta.plan === planId && currentMeta.planExpiresAt) {
    const curExp = new Date(currentMeta.planExpiresAt);
    if (!isNaN(curExp.getTime()) && curExp.getTime() > Date.now()) {
      baseDate = curExp; // extend from current expiration date
    }
  }

  const planExpiresAt = computePlanExpiry(interval, baseDate);

  // 2. Update Clerk user metadata
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...currentMeta,
      plan: planId,
      planInterval: interval,
      planExpiresAt,
      sebpayLastPaymentRef: externalReference,
      tier: "premium",
      is_premium: true,
    },
  });

  // 3. Upsert idempotent record in Supabase payments table
  try {
    const { error: dbError } = await supabase.from("payments").upsert(
      {
        user_id: userId,
        plan_id: planId,
        interval,
        amount_fcfa: amountFCFA,
        currency: "XOF",
        status: "approved",
        external_reference: externalReference,
        checkout_session_id: checkoutSessionId,
        transaction_id: transactionId,
        metadata: metadata || {},
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_reference" }
    );

    if (dbError) {
      console.error("[fulfillSubscription] Supabase payments table error:", dbError);
    }
  } catch (dbErr) {
    console.error("[fulfillSubscription] Error writing payment record to DB:", dbErr);
  }

  return {
    success: true,
    message: `Abonnement ${planId} activé jusqu'au ${planExpiresAt}`,
    plan: planId,
    expiresAt: planExpiresAt,
  };
}

