import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assertWithinSourceDailyQuota,
  ensureUserExists,
  getEffectivePlan,
  upgradeRequiredResponse,
} from "@/lib/plan";
import { recordPlanIntentEvent } from "@/lib/plan/intent-events";
import { runSourceSync } from "@/lib/sources/sync";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/sync
 * Authenticated manual sync.
 * Body: { sourceId?: string, sourceFullName?: string, reparseExisting?: boolean, runDiscovery?: boolean }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const plan = getEffectivePlan(userId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (!body.reparseExisting) {
      const syncCheck = assertWithinSourceDailyQuota(userId, "manual_sync");
      if (!syncCheck.ok) {
        return NextResponse.json(
          upgradeRequiredResponse(syncCheck.feature, syncCheck.limit, syncCheck.period),
          { status: 402 }
        );
      }
    }

    const result = await runSourceSync({
      sourceId: body.sourceId ? String(body.sourceId) : undefined,
      sourceFullName: body.sourceFullName ? String(body.sourceFullName) : undefined,
      reparseExisting: !!body.reparseExisting,
      runDiscovery: body.runDiscovery === undefined ? true : !!body.runDiscovery,
      userId,
      enforceSchedule: false,
    });

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_sync",
      route: "/api/sync",
      metadata: {
        totalNewJobs: result.totalNewJobs,
        sourceCount: result.results.length,
      },
    });

    if (result.totalNewJobs > 0) {
      const ph = getPostHogClient();
      ph.capture({
        distinctId: userId,
        event: "job_imported",
        properties: {
          jobs_count: result.totalNewJobs,
          sources_count: result.results.length,
          method: "sync",
        },
      });
      void ph.shutdown();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
