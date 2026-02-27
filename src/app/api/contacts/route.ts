import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureUserExists } from "@/lib/plan";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function toCsvValue(value: string | null | undefined): string {
  if (!value) return "";
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const format = request.nextUrl.searchParams.get("format");
    const status = request.nextUrl.searchParams.get("status");

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

    if (format === "csv") {
      const header = [
        "email",
        "name",
        "company",
        "position",
        "status",
        "source",
        "source_ref",
        "updated_at",
      ].join(",");

      const lines = rows.map((row) =>
        [
          toCsvValue(row.email),
          toCsvValue(row.name),
          toCsvValue(row.company),
          toCsvValue(row.position),
          toCsvValue(row.status),
          toCsvValue(row.source),
          toCsvValue(row.sourceRef),
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

    return NextResponse.json({ contacts: rows });
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

      const reveal = db
        .select()
        .from(schema.jobReveals)
        .where(and(eq(schema.jobReveals.userId, userId), eq(schema.jobReveals.jobId, job.id)))
        .get();

      const isPro = db
        .select()
        .from(schema.userPlan)
        .where(and(eq(schema.userPlan.userId, userId), eq(schema.userPlan.plan, "pro")))
        .get();

      if (!reveal && !isPro) {
        return NextResponse.json({ error: "Reveal contact before saving lead" }, { status: 400 });
      }

      const result = upsertContactFromJobForUser(userId, {
        email: job.contactEmail,
        company: job.company,
        position: job.role,
        sourceRef: job.issueUrl,
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
