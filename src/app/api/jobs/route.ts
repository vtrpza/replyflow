import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { ensureUserExists, getEffectivePlan } from "@/lib/plan";
import { getPostHogClient } from "@/lib/posthog-server";
import { BUILD_VERSION } from "@/lib/config";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search");
    const repo = searchParams.get("repo");
    const remote = searchParams.get("remote");
    const contractType = searchParams.get("contractType");
    const level = searchParams.get("level");
    const sort = searchParams.get("sort") || "newest";
    const outreachStatus = searchParams.get("outreachStatus");
    const contactType = searchParams.get("contactType");
    const minMatchScore = searchParams.get("minMatchScore");
    const roleFilter = searchParams.get("role");
    const sourceTypeFilter = searchParams.get("sourceType");
    const sourceIdFilter = searchParams.get("sourceId");
    const hideStale = (searchParams.get("hideStale") || "true") !== "false";
    const staleDays = parseInt(searchParams.get("staleDays") || "45", 10);

    const offset = (page - 1) * limit;

    const conditions = [
      sql`EXISTS (
        SELECT 1
        FROM source_job_links sjl
        WHERE sjl.user_id = ${userId}
          AND sjl.job_id = ${schema.jobs.id}
      )`,
    ];

    if (search) {
      conditions.push(
        sql`(${schema.jobs.title} LIKE ${`%${search}%`} OR ${schema.jobs.company} LIKE ${`%${search}%`} OR ${schema.jobs.body} LIKE ${`%${search}%`} OR ${schema.jobs.techStack} LIKE ${`%${search}%`})`
      );
    }
    if (repo) conditions.push(eq(schema.jobs.repoFullName, repo));
    if (sourceTypeFilter) conditions.push(eq(schema.jobs.sourceType, sourceTypeFilter));
    if (sourceIdFilter) conditions.push(eq(schema.jobs.sourceId, sourceIdFilter));
    if (remote === "true") conditions.push(eq(schema.jobs.isRemote, true));
    if (contractType) conditions.push(eq(schema.jobs.contractType, contractType));
    if (level) conditions.push(eq(schema.jobs.experienceLevel, level));

    if (hideStale) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - staleDays);
      conditions.push(sql`COALESCE(${schema.jobs.updatedAt}, ${schema.jobs.createdAt}) >= ${cutoffDate.toISOString()}`);
    }

    if (contactType === "hasEmail") {
      conditions.push(sql`coalesce(trim(${schema.jobs.contactEmail}), '') <> ''`);
    } else if (contactType === "atsOnly") {
      conditions.push(sql`coalesce(trim(${schema.jobs.contactEmail}), '') = '' AND coalesce(trim(${schema.jobs.applyUrl}), '') <> ''`);
    }

    if (roleFilter) {
      const rolePatterns: Record<string, string[]> = {
        frontend: ["frontend", "front-end", "front end", "desenvolvedor frontend", "desenvolvedor front"],
        backend: ["backend", "back-end", "back end", "desenvolvedor backend", "desenvolvedor back"],
        fullstack: ["fullstack", "full-stack", "full stack", "desenvolvedor fullstack", "desenvolvedor full stack"],
        devops: ["devops", "dev-ops", "sre", "infrastructure", "cloud", "desenvolvedor devops"],
        mobile: ["mobile", "desenvolvedor mobile", "ios", "android", "react native", "flutter"],
        data: ["data", "analytics", "data engineer", "data science", "cientista de dados", "engenharia de dados"],
        qa: ["qa", "quality", "test", "testing", "analista de testes"],
        lead: ["lead", "tech lead", "tech-lead", "head of", "director", "manager", "coordenador", "chefe"],
      };
      const keywords = rolePatterns[roleFilter] || [roleFilter];
      const keywordConditions = keywords.map((k) =>
        sql`LOWER(${schema.jobs.title}) LIKE ${`%${k.toLowerCase()}%`}`
      );
      const roleCondition = or(...keywordConditions);
      if (roleCondition) {
        conditions.push(roleCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs)
      .where(whereClause)
      .get();
    const total = countResult?.count || 0;

    let orderBy;
    switch (sort) {
      case "oldest":
        orderBy = sql`${schema.jobs.createdAt} ASC`;
        break;
      case "comments":
        orderBy = desc(schema.jobs.commentsCount);
        break;
      case "updated":
        orderBy = sql`${schema.jobs.updatedAt} DESC`;
        break;
      default:
        orderBy = desc(schema.jobs.createdAt);
    }

    const baseJobs = db
      .select()
      .from(schema.jobs)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)
      .all();

    const jobIds = baseJobs.map((job) => job.id);
    const links = jobIds.length > 0
      ? db
          .select()
          .from(schema.sourceJobLinks)
          .where(
            and(
              eq(schema.sourceJobLinks.userId, userId),
              inArray(schema.sourceJobLinks.jobId, jobIds)
            )
          )
          .all()
      : [];

    const linkMap = new Map<string, typeof schema.sourceJobLinks.$inferSelect>();
    for (const link of links) {
      if (!linkMap.has(link.jobId)) {
        linkMap.set(link.jobId, link);
      }
    }

    const sourceIds = Array.from(new Set(links.map((link) => link.sourceId)));
    const sources = sourceIds.length > 0
      ? db
          .select()
          .from(schema.repoSources)
          .where(
            and(
              eq(schema.repoSources.userId, userId),
              inArray(schema.repoSources.id, sourceIds)
            )
          )
          .all()
      : [];
    const sourceMap = new Map(sources.map((source) => [source.id, source]));

    const enriched = baseJobs.map((job) => {
      const outreach = db
        .select()
        .from(schema.outreachRecords)
        .where(
          and(
            eq(schema.outreachRecords.userId, userId),
            eq(schema.outreachRecords.jobId, job.id)
          )
        )
        .get();

      const score = db
        .select()
        .from(schema.jobMatchScores)
        .where(
          and(
            eq(schema.jobMatchScores.userId, userId),
            eq(schema.jobMatchScores.jobId, job.id)
          )
        )
        .get();

      const link = linkMap.get(job.id);
      const source = link?.sourceId
        ? sourceMap.get(link.sourceId)
        : job.sourceId
          ? sourceMap.get(job.sourceId)
          : null;
      const parsedReasons = safeJsonParse<string[]>(score?.reasonsJson, []);
      const parsedMissingSkills = safeJsonParse<string[]>(score?.missingSkillsJson, []);
      const parsedBreakdown = safeJsonParse<{
        skills: number;
        remote: number;
        contract: number;
        level: number;
        location: number;
      }>(score?.breakdownJson, { skills: 0, remote: 0, contract: 0, level: 0, location: 0 });

      const revealed =
        plan === "pro"
          ? true
          : !!db
              .select()
              .from(schema.jobReveals)
              .where(
                and(
                  eq(schema.jobReveals.userId, userId),
                  eq(schema.jobReveals.jobId, job.id)
                )
              )
              .get();

      return {
        ...job,
        labels: JSON.parse(job.labels),
        techStack: JSON.parse(job.techStack),
        outreachStatus: outreach?.status || "none",
        matchScore: score?.score ?? null,
        isRevealed: revealed,
        hasContact: !!(job.contactEmail || job.contactLinkedin || job.contactWhatsapp),
        isStale:
          (Date.now() - new Date(job.updatedAt || job.createdAt).getTime()) /
            (1000 * 60 * 60 * 24) >
          staleDays,
        source: source
          ? {
              id: source.id,
              type: source.sourceType,
              displayName: source.displayName || source.fullName,
              healthScore: source.healthScore,
              healthStatus: source.healthStatus,
              attributionLabel: source.attributionLabel,
              attributionUrl: source.attributionUrl,
            }
          : null,
        matchExplain: {
          reasons: parsedReasons,
          missingSkills: parsedMissingSkills,
          breakdown: parsedBreakdown,
        },
        opportunityScore:
          Math.max(0, Math.min(100, (score?.score ?? 0))) +
          (job.contactEmail ? 20 : 0) +
          (job.applyUrl && !job.contactEmail ? 8 : 0) +
          ((Date.now() - new Date(job.updatedAt || job.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= staleDays ? 12 : 0),
        contactEmail: revealed ? job.contactEmail : job.contactEmail ? "***" : null,
        contactLinkedin: revealed ? job.contactLinkedin : job.contactLinkedin ? "***" : null,
        contactWhatsapp: revealed ? job.contactWhatsapp : job.contactWhatsapp ? "***" : null,
      };
    });

    let filtered = enriched;

    if (outreachStatus === "none") {
      filtered = filtered.filter((item) => item.outreachStatus === "none");
    } else if (outreachStatus && outreachStatus !== "all") {
      filtered = filtered.filter((item) => item.outreachStatus === outreachStatus);
    }

    if (minMatchScore) {
      const minScore = parseInt(minMatchScore, 10);
      filtered = filtered.filter((item) => item.matchScore !== null && item.matchScore >= minScore);
    }

    if (sort === "matchScore") {
      filtered = [...filtered].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sort === "opportunity") {
      filtered = [...filtered].sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));
    }

    return NextResponse.json({
      jobs: filtered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id: jobId, outreachStatus } = body;

    if (!jobId || !outreachStatus) {
      return NextResponse.json({ error: "id and outreachStatus required" }, { status: 400 });
    }

    const { userId } = await ensureUserExists(session);

    const existing = db
      .select()
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, userId),
          eq(schema.outreachRecords.jobId, jobId)
        )
      )
      .get();

    const now = new Date().toISOString();

    if (!existing) {
      db.insert(schema.outreachRecords)
        .values({
          id: generateId(),
          userId,
          jobId,
          status: outreachStatus,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const outreachCount = db
        .select({ value: sql<number>`count(*)` })
        .from(schema.outreachRecords)
        .where(eq(schema.outreachRecords.userId, userId))
        .get();
      if (outreachCount?.value === 1) {
        const ph = getPostHogClient();
        ph.capture({
          distinctId: userId,
          event: "pipeline_created",
          properties: { build_version: BUILD_VERSION },
        });
        await ph.shutdown();
      }
    } else {
      db.update(schema.outreachRecords)
        .set({ status: outreachStatus, updatedAt: now })
        .where(eq(schema.outreachRecords.id, existing.id))
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update job" },
      { status: 500 }
    );
  }
}
