import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureUserExists, getEffectivePlan } from "@/lib/plan";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";
import { getContactVisibility, maskContactEmail, withJobSyncUnlock } from "@/lib/contacts/visibility";
import { isDirectContactEmail } from "@/lib/contacts/email-quality";
import type { SourceType } from "@/lib/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function toCsvValue(value: string | null | undefined): string {
  if (!value) return "";
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function normalizeSourceType(value: string | null): SourceType {
  if (value === "greenhouse_board" || value === "lever_postings") {
    return value;
  }
  return "github_repo";
}

function reconcileContactsFromVisibleJobs(userId: string): void {
  const visibleJobs = db
    .select({
      id: schema.jobs.id,
      title: schema.jobs.title,
      issueUrl: schema.jobs.issueUrl,
      company: schema.jobs.company,
      role: schema.jobs.role,
      contactEmail: schema.jobs.contactEmail,
      sourceType: schema.jobs.sourceType,
    })
    .from(schema.jobs)
    .innerJoin(schema.sourceJobLinks, eq(schema.jobs.id, schema.sourceJobLinks.jobId))
    .where(
      and(
        eq(schema.sourceJobLinks.userId, userId),
        sql`coalesce(trim(${schema.jobs.contactEmail}), '') like '%@%'`
      )
    )
    .all();

  if (visibleJobs.length === 0) {
    return;
  }

  const existingEmails = new Set(
    db
      .select({ email: schema.contacts.email })
      .from(schema.contacts)
      .where(eq(schema.contacts.userId, userId))
      .all()
      .map((row) => row.email.trim().toLowerCase())
  );

  for (const job of visibleJobs) {
    if (!job.contactEmail) {
      continue;
    }

    const normalizedEmail = job.contactEmail.trim().toLowerCase();
    if (!isDirectContactEmail(normalizedEmail)) {
      continue;
    }

    if (existingEmails.has(normalizedEmail)) {
      continue;
    }

    upsertContactFromJobForUser(userId, {
      email: normalizedEmail,
      company: job.company,
      position: job.role,
      sourceRef: job.issueUrl,
      sourceType: normalizeSourceType(job.sourceType),
      jobId: job.id,
      jobTitle: job.title,
    });

    existingEmails.add(normalizedEmail);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const plan = getEffectivePlan(userId);
    const format = request.nextUrl.searchParams.get("format");
    const status = request.nextUrl.searchParams.get("status");

    if (format !== "csv") {
      reconcileContactsFromVisibleJobs(userId);
    }

    const conditions = [eq(schema.contacts.userId, userId)];
    if (status && status !== "all") {
      conditions.push(eq(schema.contacts.status, status));
    }

    const rows = db
      .select()
      .from(schema.contacts)
      .where(and(...conditions))
      .orderBy(desc(schema.contacts.updatedAt))
      .all();

    const visibleRows = rows.map((row) => {
      const visibility = getContactVisibility({
        plan,
        source: row.source,
        customFields: row.customFields,
      });
      const masked = visibility === "masked";

      return {
        ...row,
        email: masked ? maskContactEmail(row.email) : row.email,
        visibility,
        masked,
      };
    });

    if (format === "csv") {
      const header = [
        "email",
        "name",
        "company",
        "position",
        "status",
        "source",
        "source_ref",
        "jobs_count",
        "first_seen_at",
        "last_seen_at",
        "last_job_title",
        "last_company",
        "last_source_type",
        "updated_at",
      ].join(",");

      const lines = visibleRows.map((row) =>
        [
          toCsvValue(row.email),
          toCsvValue(row.name),
          toCsvValue(row.company),
          toCsvValue(row.position),
          toCsvValue(row.status),
          toCsvValue(row.source),
          toCsvValue(row.sourceRef),
          toCsvValue(String(row.jobsCount ?? 0)),
          toCsvValue(row.firstSeenAt),
          toCsvValue(row.lastSeenAt),
          toCsvValue(row.lastJobTitle),
          toCsvValue(row.lastCompany),
          toCsvValue(row.lastSourceType),
          toCsvValue(row.updatedAt),
        ].join(",")
      );

      const csv = `${header}\n${lines.join("\n")}`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="contacts.csv"',
        },
      });
    }

    return NextResponse.json({ contacts: visibleRows, plan });
  } catch (error) {
    console.error("Contacts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const plan = getEffectivePlan(userId);
    const body = await request.json();

    if (body.jobId) {
      const job = db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.id, body.jobId))
        .get();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (!job.contactEmail) {
        return NextResponse.json({ error: "Job has no recruiter email" }, { status: 400 });
      }

      if (!isDirectContactEmail(job.contactEmail)) {
        return NextResponse.json({ error: "Job does not have a direct recruiter email" }, { status: 400 });
      }

      const reveal = db
        .select()
        .from(schema.jobReveals)
        .where(and(eq(schema.jobReveals.userId, userId), eq(schema.jobReveals.jobId, job.id)))
        .get();

      if (!reveal && plan !== "pro") {
        return NextResponse.json({ error: "Reveal contact before saving lead" }, { status: 400 });
      }

      const result = upsertContactFromJobForUser(userId, {
        email: job.contactEmail,
        company: job.company,
        position: job.role,
        sourceRef: job.issueUrl,
        sourceType: job.sourceType || "github_repo",
        jobId: job.id,
        jobTitle: job.title,
        unlock: true,
        unlockSource: "manual_save",
      });

      return NextResponse.json({ success: true, ...result });
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.userId, userId), sql`LOWER(${schema.contacts.email}) = ${email}`))
      .get();

    if (existing) {
      if (existing.source === "job_sync") {
        db.update(schema.contacts)
          .set({
            customFields: withJobSyncUnlock(existing.customFields, "manual_save"),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.contacts.id, existing.id))
          .run();
      }
      return NextResponse.json({ success: true, id: existing.id, created: false });
    }

    const now = new Date().toISOString();
    const id = generateId();
    db.insert(schema.contacts)
      .values({
        id,
        userId,
        email,
        name: body.name || null,
        company: body.company || null,
        position: body.position || null,
        source: "manual",
        sourceRef: body.sourceRef || null,
        status: body.status || "lead",
        notes: body.notes || null,
        customFields: null,
        firstSeenAt: now,
        lastSeenAt: now,
        jobsCount: 0,
        lastJobId: null,
        lastJobTitle: null,
        lastCompany: body.company || null,
        lastSourceType: "manual",
        sourceHistoryJson: "[]",
        lastContactedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({ success: true, id, created: true });
  } catch (error) {
    console.error("Contacts POST error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
