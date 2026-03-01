import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendRedditConversionEvent } from "@/lib/telemetry/reddit-capi";

const ALLOWED_EVENT_NAMES = new Set<string>([
  "SignUp",
  "PageVisit",
  "Purchase",
  "Lead",
  "ViewContent",
  "AddToCart",
]);

interface Body {
  eventName?: string;
  conversionId?: string;
  value?: number;
  currency?: string;
}

/**
 * POST /api/telemetry/reddit-conversion
 * Forwards a conversion event to Reddit Conversions API for deduplication with the pixel.
 * Session user (email, id) is added as match keys when authenticated.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const eventName = body.eventName;
    const conversionId = body.conversionId;

    if (
      !eventName ||
      !conversionId ||
      typeof eventName !== "string" ||
      typeof conversionId !== "string"
    ) {
      return NextResponse.json(
        { error: "eventName and conversionId are required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_EVENT_NAMES.has(eventName)) {
      return NextResponse.json({ error: "Invalid eventName" }, { status: 400 });
    }

    const session = await auth();
    const user =
      session?.user?.email || session?.user?.id
        ? {
            ...(session.user.email && { email: session.user.email }),
            ...(session.user.id && { external_id: session.user.id }),
          }
        : undefined;

    const result = await sendRedditConversionEvent({
      eventName,
      conversionId,
      user,
      metadata: {
        ...(body.value != null && { value: body.value }),
        ...(body.currency && { currency: body.currency }),
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Failed to send conversion event" },
        { status: result.status || 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reddit conversion telemetry route error:", error);
    return NextResponse.json(
      { error: "Failed to record conversion" },
      { status: 500 },
    );
  }
}
