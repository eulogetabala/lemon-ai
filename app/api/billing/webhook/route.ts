import { NextRequest, NextResponse } from "next/server";
import { getSebpayCheckoutSession, verifySebpayWebhookSignature } from "@/lib/sebpay";
import { fulfillSubscription } from "@/lib/billing/fulfill-subscription";
import type { PlanId, PlanInterval } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-sebpay-signature") ||
      req.headers.get("x-seb-signature") ||
      req.headers.get("x-signature");

    const isValid = verifySebpayWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === "production") {
      console.error("[api/billing/webhook] Invalid signature");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload non JSON" }, { status: 400 });
    }

    const data = payload?.data || payload;
    const sessionId = data?.checkout_session_id || data?.session_id || data?.id;

    let transactionStatus = data?.transaction_status || data?.status || "unknown";
    let externalReference = data?.external_reference || payload?.external_reference;
    let transactionId = data?.transaction_id || data?.reference;
    let amount = Number(data?.amount || 0);

    // Defense-in-depth: query Sebpay directly to verify the session
    if (sessionId) {
      try {
        const verifiedSession = await getSebpayCheckoutSession(sessionId);
        transactionStatus = verifiedSession.transaction_status || transactionStatus;
        externalReference = verifiedSession.external_reference || externalReference;
        transactionId = verifiedSession.transaction_id || transactionId;
        if (verifiedSession.amount) amount = Number(verifiedSession.amount);
      } catch (err) {
        console.warn("[api/billing/webhook] Failed to retrieve session from Sebpay directly:", err);
      }
    }

    if (!externalReference) {
      console.warn("[api/billing/webhook] Missing external_reference");
      return NextResponse.json({ received: true, warning: "Missing external_reference" });
    }

    // external_reference format: `${userId}_${planId}_${interval}_${timestamp}`
    const parts = externalReference.split("_");
    if (parts.length < 4) {
      console.warn("[api/billing/webhook] Invalid external_reference format:", externalReference);
      return NextResponse.json({ received: true, warning: "Invalid format" });
    }

    const userId = parts[0];
    const planId = parts[1] as PlanId;
    const interval = parts[2] as PlanInterval;

    await fulfillSubscription({
      userId,
      planId,
      interval,
      amountFCFA: amount,
      externalReference,
      checkoutSessionId: sessionId,
      transactionId,
      transactionStatus,
      metadata: payload,
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[api/billing/webhook] Error processing webhook:", error);
    return NextResponse.json({ error: error?.message || "Erreur interne" }, { status: 500 });
  }
}

