import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists } from "@/lib/plan";
import { cancelUserSubscription } from "@/lib/billing/service";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);
    const result = await cancelUserSubscription(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Billing cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
