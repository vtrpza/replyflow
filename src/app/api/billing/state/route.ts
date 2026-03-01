import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists } from "@/lib/plan";
import { getBillingState } from "@/lib/billing/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = ensureUserExists(session);
    const state = getBillingState(userId);

    return NextResponse.json(state);
  } catch (error) {
    console.error("Billing state error:", error);
    return NextResponse.json({ error: "Failed to fetch billing state" }, { status: 500 });
  }
}
