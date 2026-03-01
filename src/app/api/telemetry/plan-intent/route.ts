import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists, getEffectivePlan } from "@/lib/plan";
import { recordPlanIntentEvent } from "@/lib/plan/intent-events";

interface PlanIntentRequestBody {
  eventType?: string;
  feature?: string;
  route?: string;
}

const ALLOWED_EVENT_TYPES = new Set<string>(["upgrade_cta_click"]);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = ensureUserExists(session);
    const body = (await request.json().catch(() => ({}))) as PlanIntentRequestBody;

    if (!body.eventType || !ALLOWED_EVENT_TYPES.has(body.eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const plan = getEffectivePlan(userId);
    recordPlanIntentEvent({
      userId,
      plan,
      eventType: body.eventType as "upgrade_cta_click",
      feature: body.feature,
      route: body.route || "/app/settings",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Plan intent telemetry route error:", error);
    return NextResponse.json({ error: "Failed to record telemetry" }, { status: 500 });
  }
}
