import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function upsertContactFromJobForUser(
  userId: string,
  input: {
    email: string;
    company?: string | null;
    position?: string | null;
    sourceRef?: string | null;
  }
): { id: string; created: boolean } {
  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const existing = db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, userId),
        sql`LOWER(${schema.contacts.email}) = ${normalizedEmail}`
      )
    )
    .get();

  if (existing) {
    db.update(schema.contacts)
      .set({
        company: existing.company || input.company || null,
        position: existing.position || input.position || null,
        sourceRef: existing.sourceRef || input.sourceRef || null,
        updatedAt: now,
      })
      .where(eq(schema.contacts.id, existing.id))
      .run();

    return { id: existing.id, created: false };
  }

  const id = generateId();
  db.insert(schema.contacts)
    .values({
      id,
      userId,
      email: normalizedEmail,
      name: null,
      company: input.company || null,
      position: input.position || null,
      source: "job_sync",
      sourceRef: input.sourceRef || null,
      status: "lead",
      notes: null,
      customFields: null,
      lastContactedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, created: true };
}
