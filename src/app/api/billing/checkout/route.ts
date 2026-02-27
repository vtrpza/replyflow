import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists } from "@/lib/plan";
import { createProCheckoutForUser } from "@/lib/billing/service";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const result = await createProCheckoutForUser(userId);

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      providerCheckoutId: result.providerCheckoutId,
    });
  } catch (error) {
    if (
      error instanceof Error
      && (error.message.includes("active subscription") || error.message.includes("active entitlement"))
    ) {
      return NextResponse.json({ error: "Subscription already active" }, { status: 409 });
    }

    console.error("Billing checkout error:", error);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}
