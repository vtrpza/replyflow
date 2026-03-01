import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  assertWithinSourceEnableQuota,
  ensureUserExists,
  getEffectivePlan,
  upgradeRequiredResponse,
} from "@/lib/plan";
import { recordPlanIntentEvent } from "@/lib/plan/intent-events";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = await ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const source = db
      .select()
      .from(schema.repoSources)
      .where(and(eq(schema.repoSources.id, id), eq(schema.repoSources.userId, userId)))
      .get();

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const nextEnabled = body.enabled !== undefined ? !!body.enabled : source.enabled;
    const nextSyncInterval = typeof body.syncIntervalMinutes === "number"
      ? Math.max(5, Math.min(1440, Math.round(body.syncIntervalMinutes)))
      : source.syncIntervalMinutes;

    if (!source.enabled && nextEnabled) {
      const enableCheck = assertWithinSourceEnableQuota(userId, source.sourceType);
      if (!enableCheck.ok) {
        return NextResponse.json(
          upgradeRequiredResponse(enableCheck.feature, enableCheck.limit, enableCheck.period),
          { status: 402 }
        );
      }
    }

    db.update(schema.repoSources)
      .set({
        enabled: nextEnabled,
        displayName: body.displayName !== undefined ? String(body.displayName || "") || null : source.displayName,
        category: body.category !== undefined ? String(body.category || "") || source.category : source.category,
        technology: body.technology !== undefined ? String(body.technology || "") || null : source.technology,
        regionTagsJson: Array.isArray(body.regionTags)
          ? JSON.stringify(body.regionTags.map((tag) => String(tag)))
          : source.regionTagsJson,
        syncIntervalMinutes: nextSyncInterval,
        termsAcceptedAt: body.acceptTerms === true ? new Date().toISOString() : source.termsAcceptedAt,
      })
      .where(and(eq(schema.repoSources.id, id), eq(schema.repoSources.userId, userId)))
      .run();

    if (!source.enabled && nextEnabled) {
      recordPlanIntentEvent({
        userId,
        plan,
        eventType: "core_action_source_enable",
        route: "/api/sources/[id]",
        metadata: {
          sourceId: source.id,
          sourceType: source.sourceType,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sources PATCH error:", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}
