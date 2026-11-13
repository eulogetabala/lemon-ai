import { NextRequest, NextResponse } from "next/server";
import { getSebpayCheckoutSession } from "@/lib/sebpay";
import { fulfillSubscription } from "@/lib/billing/fulfill-subscription";
import type { PlanId, PlanInterval } from "@/lib/plan-limits";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId =
    searchParams.get("checkout_session_id") ||
    searchParams.get("session_id") ||
    searchParams.get("id");

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  if (!sessionId) {
    return NextResponse.redirect(`${baseUrl}/billing?status=unknown`);
  }

  try {
    const session = await getSebpayCheckoutSession(sessionId);
    const transactionStatus = session.transaction_status || session.status || "unknown";

    if (
      transactionStatus.toLowerCase() === "approved" ||
      transactionStatus.toLowerCase() === "success" ||
      transactionStatus.toLowerCase() === "completed"
    ) {
      const extRef = session.external_reference || "";
      const parts = extRef.split("_");

      if (parts.length >= 4) {
        const userId = parts[0];
        const planId = parts[1] as PlanId;
        const interval = parts[2] as PlanInterval;

        await fulfillSubscription({
          userId,
          planId,
          interval,
          amountFCFA: Number(session.amount || 0),
          externalReference: extRef,
          checkoutSessionId: session.id,
          transactionId: session.transaction_id,
          transactionStatus: "approved",
          metadata: session.metadata,
        });

        return NextResponse.redirect(`${baseUrl}/billing?payment=success&plan=${planId}`);
      }
    }

    if (transactionStatus.toLowerCase() === "pending") {
      return NextResponse.redirect(`${baseUrl}/billing?payment=pending`);
    }

    return NextResponse.redirect(`${baseUrl}/billing?payment=failed&status=${transactionStatus}`);
  } catch (error) {
    console.error("[api/billing/return] Error handling return:", error);
    return NextResponse.redirect(`${baseUrl}/billing?payment=error`);
  }
}

