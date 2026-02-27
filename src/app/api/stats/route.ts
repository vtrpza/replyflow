import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { ensureUserExists, getPlanInfo } from "@/lib/plan";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const visibleJobsCondition = sql`EXISTS (
      SELECT 1
      FROM source_job_links sjl
      WHERE sjl.user_id = ${userId}
        AND sjl.job_id = ${schema.jobs.id}
    )`;

    const totalResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(visibleJobsCondition)
      .get();
    const totalJobs = totalResult?.count || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`${schema.jobs.createdAt} >= ${today.toISOString()}`))
      .get();
    const newJobsToday = todayResult?.count || 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`${schema.jobs.createdAt} >= ${weekAgo.toISOString()}`))
      .get();
    const newJobsThisWeek = weekResult?.count || 0;

    const reposResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.repoSources)
      .where(and(eq(schema.repoSources.userId, userId), eq(schema.repoSources.enabled, true)))
      .get();
    const totalReposMonitored = reposResult?.count || 0;

    const outreachSent = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          sql`${schema.outreachRecords.status} IN ('email_sent', 'followed_up', 'replied', 'interviewing', 'accepted')`
        )
      )
      .get();

    const replies = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          sql`${schema.outreachRecords.status} IN ('replied', 'interviewing', 'accepted')`
        )
      )
      .get();

    const interviews = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          sql`${schema.outreachRecords.status} IN ('interviewing', 'accepted')`
        )
      )
      .get();

    const remoteCount = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, eq(schema.jobs.isRemote, true)))
      .get();

    const contractTypes = db
      .select({
        type: schema.jobs.contractType,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`${schema.jobs.contractType} IS NOT NULL`))
      .groupBy(schema.jobs.contractType)
      .all();

    const experienceLevels = db
      .select({
        level: schema.jobs.experienceLevel,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`${schema.jobs.experienceLevel} IS NOT NULL`))
      .groupBy(schema.jobs.experienceLevel)
      .all();

    const jobsByRepo = db
      .select({
        repo: schema.jobs.repoFullName,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .where(visibleJobsCondition)
      .groupBy(schema.jobs.repoFullName)
      .orderBy(sql`count(*) DESC`)
      .limit(10)
      .all();

    const jobsWithEmail = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`coalesce(trim(${schema.jobs.contactEmail}), '') <> ''`))
      .get();

    const uniqueRecruiterEmails = db
      .select({ count: sql<number>`count(distinct lower(trim(${schema.jobs.contactEmail})))` })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`coalesce(trim(${schema.jobs.contactEmail}), '') <> ''`))
      .get();

    const uniqueRecruiterDomains = db
      .select({
        count: sql<number>`count(distinct lower(substr(trim(${schema.jobs.contactEmail}), instr(trim(${schema.jobs.contactEmail}), '@') + 1)))`,
      })
      .from(schema.jobs)
      .where(and(visibleJobsCondition, sql`coalesce(trim(${schema.jobs.contactEmail}), '') like '%@%'`))
      .get();

    const jobsAtsOnly = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(
        and(
          visibleJobsCondition,
          sql`coalesce(trim(${schema.jobs.contactEmail}), '') = '' AND coalesce(trim(${schema.jobs.applyUrl}), '') <> ''`
        )
      )
      .get();

    const jobsWithMatchScore = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobMatchScores)
      .where(eq(schema.jobMatchScores.userId, userId))
      .get();

    const lastCalculated = db
      .select({ date: schema.jobMatchScores.calculatedAt })
      .from(schema.jobMatchScores)
      .where(eq(schema.jobMatchScores.userId, userId))
      .orderBy(sql`${schema.jobMatchScores.calculatedAt} DESC`)
      .limit(1)
      .get();

    const outreachDrafted = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "email_drafted")
        )
      )
      .get();

    const outreachSentOnly = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "email_sent")
        )
      )
      .get();

    const outreachFollowedUp = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "followed_up")
        )
      )
      .get();

    const outreachReplied = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "replied")
        )
      )
      .get();

    const outreachInterviewing = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "interviewing")
        )
      )
      .get();

    const outreachAccepted = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.status, "accepted")
        )
      )
      .get();

    const planInfo = getPlanInfo(userId);

    return NextResponse.json({
      totalJobs,
      newJobsToday,
      newJobsThisWeek,
      totalReposMonitored,
      totalOutreachSent: outreachSent?.count || 0,
      totalReplies: replies?.count || 0,
      totalInterviews: interviews?.count || 0,
      remoteJobs: remoteCount?.count || 0,
      jobsWithEmail: jobsWithEmail?.count || 0,
      uniqueRecruiterEmails: uniqueRecruiterEmails?.count || 0,
      uniqueRecruiterDomains: uniqueRecruiterDomains?.count || 0,
      jobsAtsOnly: jobsAtsOnly?.count || 0,
      jobsWithMatchScore: jobsWithMatchScore?.count || 0,
      matchScoreLastCalculated: lastCalculated?.date || null,
      outreachDrafted: outreachDrafted?.count || 0,
      outreachSentOnly: outreachSentOnly?.count || 0,
      outreachFollowedUp: outreachFollowedUp?.count || 0,
      outreachReplied: outreachReplied?.count || 0,
      outreachInterviewing: outreachInterviewing?.count || 0,
      outreachAccepted: outreachAccepted?.count || 0,
      jobsByContractType: contractTypes.map((ct) => ({
        type: ct.type || "Unknown",
        count: ct.count,
      })),
      jobsByExperienceLevel: experienceLevels.map((el) => ({
        level: el.level || "Unknown",
        count: el.count,
      })),
      jobsByRepo,
      plan: planInfo.plan,
      usage: planInfo.usage,
      limits: planInfo.limits,
      sourceUsage: planInfo.sourceUsage,
      sourceLimits: planInfo.sourceLimits,
      enabledSources: planInfo.enabledSources,
      enabledAtsSources: planInfo.enabledAtsSources,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
