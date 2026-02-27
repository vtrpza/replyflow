import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { ensureUserExists, getEffectivePlan } from "@/lib/plan";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureUserExists(session);
    const userId = session.user.id;
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

    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${schema.jobs.title} LIKE ${`%${search}%`} OR ${schema.jobs.company} LIKE ${`%${search}%`} OR ${schema.jobs.body} LIKE ${`%${search}%`} OR ${schema.jobs.techStack} LIKE ${`%${search}%`})`
      );
    }
    if (repo) conditions.push(eq(schema.jobs.repoFullName, repo));
    if (remote === "true") conditions.push(eq(schema.jobs.isRemote, true));
    if (contractType) conditions.push(eq(schema.jobs.contractType, contractType));
    if (level) conditions.push(eq(schema.jobs.experienceLevel, level));

    if (contactType === "hasEmail") {
      conditions.push(sql`${schema.jobs.contactEmail} IS NOT NULL`);
    } else if (contactType === "atsOnly") {
      conditions.push(sql`${schema.jobs.contactEmail} IS NULL AND ${schema.jobs.applyUrl} IS NOT NULL`);
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
      conditions.push(or(...keywordConditions));
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

    const existing = db
      .select()
      .from(schema.outreachRecords)
      .where(
        and(
          eq(schema.outreachRecords.userId, session.user.id),
          eq(schema.outreachRecords.jobId, jobId)
        )
      )
      .get();

    const now = new Date().toISOString();

    if (!existing) {
      db.insert(schema.outreachRecords)
        .values({
          id: generateId(),
          userId: session.user.id,
          jobId,
          status: outreachStatus,
          createdAt: now,
          updatedAt: now,
        })
        .run();
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
