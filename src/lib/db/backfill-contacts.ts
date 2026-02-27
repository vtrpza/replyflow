import { and, eq, sql } from "drizzle-orm";
import { db, schema, DB_PATH } from "./index";
import { upsertContactFromJobForUser } from "../contacts/upsert";
import type { SourceType } from "../types";
import { isDirectContactEmail } from "../contacts/email-quality";

const VALID_SOURCE_TYPES: SourceType[] = ["github_repo", "greenhouse_board", "lever_postings"];

function normalizeSourceType(value: string | null): SourceType {
  if (value && VALID_SOURCE_TYPES.includes(value as SourceType)) {
    return value as SourceType;
  }
  return "github_repo";
}

function run(): void {
  console.log(`Backfilling contacts from jobs on ${DB_PATH}...`);

  const users = db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).all();
  if (users.length === 0) {
    console.log("No users found. Nothing to backfill.");
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const user of users) {
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
          eq(schema.sourceJobLinks.userId, user.id),
          sql`coalesce(trim(${schema.jobs.contactEmail}), '') like '%@%'`
        )
      )
      .all();

    if (visibleJobs.length === 0) {
      console.log(`User ${user.email}: no visible jobs with contact email.`);
      continue;
    }

    let createdForUser = 0;
    let updatedForUser = 0;

    for (const job of visibleJobs) {
      if (!job.contactEmail || !isDirectContactEmail(job.contactEmail)) {
        continue;
      }

      const result = upsertContactFromJobForUser(user.id, {
        email: job.contactEmail,
        company: job.company,
        position: job.role,
        sourceRef: job.issueUrl,
        sourceType: normalizeSourceType(job.sourceType),
        jobId: job.id,
        jobTitle: job.title,
      });

      if (result.created) {
        createdForUser += 1;
      } else {
        updatedForUser += 1;
      }
    }

    totalCreated += createdForUser;
    totalUpdated += updatedForUser;

    console.log(
      `User ${user.email}: visible_jobs=${visibleJobs.length}, created=${createdForUser}, updated=${updatedForUser}`
    );
  }

  console.log(`Backfill complete. created=${totalCreated}, updated=${totalUpdated}`);
}

run();
