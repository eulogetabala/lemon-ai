import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSebpayCheckoutSession } from "@/lib/sebpay";
import { getCheckoutAmountFCFA, getPlanConfig, type PlanId, type PlanInterval } from "@/lib/plan-limits";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = body?.planId as PlanId;
    const interval = (body?.interval || "monthly") as PlanInterval;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
    const operator = typeof body?.operator === "string" ? body.operator.trim() : "mtn_congo";

    if (!planId || (planId !== "pro" && planId !== "team")) {
      return NextResponse.json(
        { error: "Seuls les forfaits Pro et Équipe peuvent être souscrits via paiement direct." },
        { status: 400 }
      );
    }

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json({ error: "Fréquence invalide (monthly ou yearly attendu)" }, { status: 400 });
    }

    const amount = getCheckoutAmountFCFA(planId, interval);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide pour ce forfait" }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;

    const externalReference = `${userId}_${planId}_${interval}_${Date.now()}`;
    const planConfig = getPlanConfig(planId);

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    // Sebpay requires a valid public HTTPS URL for the webhook callback
    const callbackUrl =
      baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1")
        ? "https://eulogetabala.cg/api/billing/webhook"
        : `${baseUrl}/api/billing/webhook`;
    const redirectUrl = `${baseUrl}/api/billing/return`;

    const description = `Abonnement ${planConfig.name} (${interval === "yearly" ? "Annuel" : "Mensuel"}) - Lemon AI · ${operator === "airtel_congo" ? "Airtel Money" : operator === "card" ? "Carte Bancaire" : "MTN MoMo"}`;

    // Attempt to pre-create payment record
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from("payments").insert({
        user_id: userId,
        plan_id: planId,
        interval,
        amount_fcfa: amount,
        currency: "XOF",
        status: "pending",
        external_reference: externalReference,
        metadata: {
          email,
          customer_name: fullName,
          plan_name: planConfig.name,
          phone,
          operator,
          country: "CG",
        },
      });
    } catch (e) {
      // Graceful if table not yet migrated
    }

    const session = await createSebpayCheckoutSession({
      amount,
      currency: "XOF",
      externalReference,
      callbackUrl,
      redirectUrl,
      description,
      customer: {
        email,
        name: fullName,
        phone,
      },
      metadata: {
        userId,
        planId,
        interval,
        externalReference,
        phone,
        operator,
        country: "CG",
      },
    });

    // Update payment with sessionId if possible
    try {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from("payments")
        .update({ checkout_session_id: session.sessionId })
        .eq("external_reference", externalReference);
    } catch {}

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      externalReference,
    });
  } catch (error: any) {
    console.error("[api/billing/checkout] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'initialisation du paiement Sebpay." },
      { status: 500 }
    );
  }
}
