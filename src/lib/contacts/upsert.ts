import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withJobSyncUnlock } from "@/lib/contacts/visibility";

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
    sourceType?: string | null;
    jobId?: string | null;
    jobTitle?: string | null;
    unlock?: boolean;
    unlockSource?: "reveal" | "manual_save" | "outreach";
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

  const historyEntry = input.sourceRef
    ? {
        sourceRef: input.sourceRef,
        sourceType: input.sourceType || "github_repo",
        jobId: input.jobId || null,
        jobTitle: input.jobTitle || null,
        seenAt: now,
      }
    : null;

  if (existing) {
    const parsedHistory = existing.sourceHistoryJson
      ? (() => {
          try {
            return JSON.parse(existing.sourceHistoryJson) as Array<{ sourceRef?: string }>;
          } catch {
            return [] as Array<{ sourceRef?: string }>;
          }
        })()
      : [];

    const hasSeenThisSource =
      !!input.sourceRef &&
      parsedHistory.some((entry) => entry.sourceRef && entry.sourceRef === input.sourceRef);

    const nextHistory = historyEntry
      ? hasSeenThisSource
        ? parsedHistory
        : [historyEntry, ...parsedHistory].slice(0, 25)
      : parsedHistory;

    const nextCustomFields = input.unlock
      ? withJobSyncUnlock(existing.customFields, input.unlockSource || "manual_save")
      : existing.customFields;

    db.update(schema.contacts)
      .set({
        company: existing.company || input.company || null,
        position: existing.position || input.position || null,
        sourceRef: input.sourceRef || existing.sourceRef || null,
        firstSeenAt: existing.firstSeenAt || now,
        lastSeenAt: now,
        jobsCount: hasSeenThisSource ? existing.jobsCount : existing.jobsCount + 1,
        lastJobId: input.jobId || existing.lastJobId || null,
        lastJobTitle: input.jobTitle || existing.lastJobTitle || null,
        lastCompany: input.company || existing.lastCompany || existing.company || null,
        lastSourceType: input.sourceType || existing.lastSourceType || null,
        sourceHistoryJson: JSON.stringify(nextHistory),
        customFields: nextCustomFields,
        updatedAt: now,
      })
      .where(eq(schema.contacts.id, existing.id))
      .run();

    return { id: existing.id, created: false };
  }

  const id = generateId();
  const customFields = input.unlock
    ? withJobSyncUnlock(null, input.unlockSource || "manual_save")
    : null;

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
      customFields,
      firstSeenAt: now,
      lastSeenAt: now,
      jobsCount: 1,
      lastJobId: input.jobId || null,
      lastJobTitle: input.jobTitle || null,
      lastCompany: input.company || null,
      lastSourceType: input.sourceType || null,
      sourceHistoryJson: JSON.stringify(historyEntry ? [historyEntry] : []),
      lastContactedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, created: true };
}
