import { NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing/config";
import { reconcileBillingForUser, reconcileStaleBilling } from "@/lib/billing/reconciliation";

interface ReconcileBody {
  userId?: string;
  maxUsers?: number;
}

export async function POST(request: Request) {
  try {
    const config = getBillingConfig();
    const token = request.headers.get("x-replyflow-billing-token");

    if (!token || token !== config.BILLING_RECONCILE_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ReconcileBody;

    if (body.userId) {
      const result = await reconcileBillingForUser(body.userId);
      return NextResponse.json({
        success: true,
        results: [result],
      });
    }

    const maxUsers = typeof body.maxUsers === "number" ? Math.max(1, Math.min(200, body.maxUsers)) : 50;
    const results = await reconcileStaleBilling(maxUsers);

    return NextResponse.json({
      success: true,
      total: results.length,
      failures: results.filter((item) => !item.success).length,
      results,
    });
  } catch (error) {
    console.error("Billing reconciliation error:", error);
    return NextResponse.json({ error: "Failed to reconcile billing" }, { status: 500 });
  }
}
