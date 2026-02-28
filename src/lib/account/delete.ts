import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function deleteUserAccount(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Collect source IDs to clean up sourceSyncRuns (no userId column on that table)
    const userSourceIds = tx
      .select({ id: schema.repoSources.id })
      .from(schema.repoSources)
      .where(eq(schema.repoSources.userId, userId))
      .all()
      .map((s) => s.id);

    if (userSourceIds.length > 0) {
      await tx
        .delete(schema.sourceSyncRuns)
        .where(inArray(schema.sourceSyncRuns.sourceId, userSourceIds));
    }

    // Billing (children first — FK references users.id)
    await tx.delete(schema.billingPayments).where(eq(schema.billingPayments.userId, userId));
    await tx.delete(schema.billingSubscriptions).where(eq(schema.billingSubscriptions.userId, userId));
    await tx.delete(schema.billingCustomers).where(eq(schema.billingCustomers.userId, userId));

    // Usage & telemetry
    await tx.delete(schema.usageCounters).where(eq(schema.usageCounters.userId, userId));
    await tx.delete(schema.planIntentEvents).where(eq(schema.planIntentEvents.userId, userId));

    // Job-related per-user data
    await tx.delete(schema.jobReveals).where(eq(schema.jobReveals.userId, userId));
    await tx.delete(schema.jobMatchScores).where(eq(schema.jobMatchScores.userId, userId));
    await tx.delete(schema.outreachRecords).where(eq(schema.outreachRecords.userId, userId));

    // Email & contacts
    await tx.delete(schema.outboundEmails).where(eq(schema.outboundEmails.userId, userId));
    await tx.delete(schema.conversationThreads).where(eq(schema.conversationThreads.userId, userId));
    await tx.delete(schema.contacts).where(eq(schema.contacts.userId, userId));
    await tx.delete(schema.connectedEmailAccounts).where(eq(schema.connectedEmailAccounts.userId, userId));
    await tx.delete(schema.emailTemplates).where(eq(schema.emailTemplates.userId, userId));

    // Sources (sourceJobLinks FK → repoSources.id, so delete links first)
    await tx.delete(schema.sourceJobLinks).where(eq(schema.sourceJobLinks.userId, userId));
    await tx.delete(schema.repoSources).where(eq(schema.repoSources.userId, userId));
    await tx.delete(schema.sourceUsageDaily).where(eq(schema.sourceUsageDaily.userId, userId));

    // Plan & profile (FK → users.id)
    await tx.delete(schema.userPlan).where(eq(schema.userPlan.userId, userId));
    await tx.delete(schema.userProfile).where(eq(schema.userProfile.userId, userId));

    // Auth tables last (sessions/accounts FK → users.id, then users itself)
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
    await tx.delete(schema.users).where(eq(schema.users.id, userId));
  });
}
