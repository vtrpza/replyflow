import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { assertWithinPlan, ensureUserExists, getEffectivePlan, upgradeRequiredResponse } from "@/lib/plan";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";
import { recordPlanIntentEvent, recordUpgradeBlockedIntent } from "@/lib/plan/intent-events";
import { isDirectContactEmail } from "@/lib/contacts/email-quality";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .get();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const existingReveal = db
      .select()
      .from(schema.jobReveals)
      .where(and(eq(schema.jobReveals.userId, userId), eq(schema.jobReveals.jobId, jobId)))
      .get();

    if (!existingReveal) {
      const revealCheck = assertWithinPlan(userId, "reveals");
      if (!revealCheck.ok) {
        recordUpgradeBlockedIntent({
          userId,
          plan,
          feature: revealCheck.feature,
          route: "/api/jobs/reveal",
          limit: revealCheck.limit,
          period: revealCheck.period,
        });
        return NextResponse.json(
          upgradeRequiredResponse(revealCheck.feature, revealCheck.limit),
          { status: 402 }
        );
      }

      db.insert(schema.jobReveals)
        .values({
          id: generateId(),
          userId,
          jobId,
          createdAt: new Date().toISOString(),
        })
        .run();
    }

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_reveal",
      route: "/api/jobs/reveal",
      metadata: {
        jobId,
      },
    });

    if (job.contactEmail && isDirectContactEmail(job.contactEmail)) {
      upsertContactFromJobForUser(userId, {
        email: job.contactEmail,
        company: job.company,
        position: job.role,
        sourceRef: job.issueUrl,
        sourceType: job.sourceType || "github_repo",
        jobId: job.id,
        jobTitle: job.title,
        unlock: true,
        unlockSource: "reveal",
      });
    }

    return NextResponse.json({
      success: true,
      revealed: true,
      contact: {
        email: job.contactEmail,
        linkedin: job.contactLinkedin,
        whatsapp: job.contactWhatsapp,
      },
    });
  } catch (error) {
    console.error("Reveal error:", error);
    return NextResponse.json({ error: "Failed to reveal contact" }, { status: 500 });
  }
}
