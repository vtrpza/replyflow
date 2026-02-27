import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { ensureUserExists, getPlanInfo } from "@/lib/plan";
import { getContactVisibility } from "@/lib/contacts/visibility";

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
        type: sql<string>`case
          when nullif(trim(${schema.jobs.contractType}), '') is not null then trim(${schema.jobs.contractType})
          when ${schema.jobs.sourceType} in ('greenhouse_board', 'lever_postings') then 'PJ'
          else 'CLT'
        end`,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .where(visibleJobsCondition)
      .groupBy(sql`case
          when nullif(trim(${schema.jobs.contractType}), '') is not null then trim(${schema.jobs.contractType})
          when ${schema.jobs.sourceType} in ('greenhouse_board', 'lever_postings') then 'PJ'
          else 'CLT'
        end`)
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

    const jobsForContactStats = db
      .select({
        contactEmail: schema.jobs.contactEmail,
        applyUrl: schema.jobs.applyUrl,
      })
      .from(schema.jobs)
      .where(visibleJobsCondition)
      .all();

    let jobsWithEmail = 0;
    let jobsAtsOnly = 0;
    const uniqueEmailSet = new Set<string>();
    const uniqueDomainSet = new Set<string>();

    for (const job of jobsForContactStats) {
      const contactEmail = (job.contactEmail || "").trim().toLowerCase();
      const hasScrapedEmail = contactEmail.includes("@");
      const hasApplyUrl = !!(job.applyUrl || "").trim();

      if (hasScrapedEmail) {
        jobsWithEmail += 1;
        uniqueEmailSet.add(contactEmail);
        const domain = contactEmail.split("@")[1];
        if (domain) {
          uniqueDomainSet.add(domain);
        }
      } else if (hasApplyUrl) {
        jobsAtsOnly += 1;
      }
    }

    const uniqueRecruiterEmails = uniqueEmailSet.size;
    const uniqueRecruiterDomains = uniqueDomainSet.size;

    const unknownContracts = 0;
    const classifiedContracts = totalJobs;
    const contractCoveragePct = totalJobs > 0 ? 100 : 0;

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

    const contacts = db
      .select({
        source: schema.contacts.source,
        customFields: schema.contacts.customFields,
      })
      .from(schema.contacts)
      .where(eq(schema.contacts.userId, userId))
      .all();

    const contactsTotal = contacts.length;
    const scrapedContactsTotal = contacts.filter((contact) => contact.source === "job_sync").length;
    const unlockedContactsTotal = contacts.filter((contact) => (
      getContactVisibility({
        plan: planInfo.plan,
        source: contact.source,
        customFields: contact.customFields,
      }) === "full"
    )).length;

    return NextResponse.json({
      totalJobs,
      newJobsToday,
      newJobsThisWeek,
      totalReposMonitored,
      totalOutreachSent: outreachSent?.count || 0,
      totalReplies: replies?.count || 0,
      totalInterviews: interviews?.count || 0,
      remoteJobs: remoteCount?.count || 0,
      jobsWithEmail,
      jobsWithDirectEmail: jobsWithEmail,
      uniqueRecruiterEmails,
      uniqueRecruiterDomains,
      jobsAtsOnly,
      contactsTotal,
      scrapedContactsTotal,
      unlockedContactsTotal,
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
      contractCoverage: {
        classifiedJobs: classifiedContracts,
        unknownJobs: unknownContracts,
        coveragePct: contractCoveragePct,
      },
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
