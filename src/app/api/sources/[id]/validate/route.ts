import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  assertWithinSourceDailyQuota,
  ensureUserExists,
  getEffectivePlan,
  upgradeRequiredResponse,
} from "@/lib/plan";
import { recordPlanIntentEvent } from "@/lib/plan/intent-events";
import { getSourceConnector } from "@/lib/sources/connectors";
import { computeSourceHealth } from "@/lib/sources/health";
import type { SourceType } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const { id } = await context.params;
    const source = db
      .select()
      .from(schema.repoSources)
      .where(and(eq(schema.repoSources.id, id), eq(schema.repoSources.userId, userId)))
      .get();

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const validationCheck = assertWithinSourceDailyQuota(userId, "source_validate");
    if (!validationCheck.ok) {
      return NextResponse.json(
        upgradeRequiredResponse(validationCheck.feature, validationCheck.limit, validationCheck.period),
        { status: 402 }
      );
    }

    const connector = getSourceConnector(source.sourceType as SourceType);
    const result = await connector.fetchJobs({
      id: source.id,
      userId: source.userId,
      sourceType: source.sourceType as SourceType,
      displayName: source.displayName,
      owner: source.owner,
      repo: source.repo,
      externalKey: source.externalKey,
      fullName: source.fullName,
      url: source.url,
      category: source.category,
      technology: source.technology,
      enabled: source.enabled,
      syncIntervalMinutes: source.syncIntervalMinutes,
      lastScrapedAt: source.lastScrapedAt,
    });

    const parseSuccess = result.jobs.filter((job) => job.body.length > 0 || job.applyUrl).length;
    const contacts = result.jobs.filter((job) => /@/.test(job.body)).length;

    const health = computeSourceHealth({
      fetchSucceeded: true,
      hadComplianceIssue: false,
      parseSuccessRatio: result.jobs.length > 0 ? parseSuccess / result.jobs.length : 0,
      contactYieldRatio: result.jobs.length > 0 ? contacts / result.jobs.length : 0,
      latencyMs: result.latencyMs,
      minutesSinceSuccess: 0,
      consecutiveFailures: 0,
    });

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_validate",
      route: "/api/sources/[id]/validate",
      metadata: {
        sourceId: source.id,
        sourceType: source.sourceType,
        fetched: result.jobs.length,
      },
    });

    return NextResponse.json({
      success: true,
      source: source.fullName,
      fetched: result.jobs.length,
      sampleJobs: result.jobs.slice(0, 3).map((job) => ({
        externalJobId: job.externalJobId,
        title: job.title,
        updatedAt: job.updatedAt,
        issueUrl: job.issueUrl,
      })),
      health,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error("Sources validate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate source" },
      { status: 500 }
    );
  }
}
