import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { resolvePlanFromMetadata, type PlanMetadata } from "@/lib/plan-limits";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = (user.publicMetadata || {}) as PlanMetadata;
    const plan = resolvePlanFromMetadata(meta);

    const supabase = getSupabaseAdminClient();
    let payments: any[] = [];
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        payments = data;
      } else if (error && error.code !== "PGRST205") {
        console.warn("[api/billing/payments] Payments query warning:", error.message);
      }
    } catch {
      // Table may not exist yet before migration
    }

    return NextResponse.json({
      plan,
      planInterval: meta.planInterval || "monthly",
      planExpiresAt: meta.planExpiresAt || null,
      payments: payments || [],
    });
  } catch (error: any) {
    console.error("[api/billing/payments] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne" },
      { status: 500 }
    );
  }
}

