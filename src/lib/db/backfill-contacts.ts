import { sql } from "drizzle-orm";
import { db, schema, DB_PATH } from "./index";
import { upsertContactFromJobForUser } from "../contacts/upsert";
import type { SourceType } from "../types";

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

  const jobs = db
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
    .where(sql`coalesce(trim(${schema.jobs.contactEmail}), '') like '%@%'`)
    .all();

  if (jobs.length === 0) {
    console.log("No jobs with contact email found. Nothing to backfill.");
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const user of users) {
    let createdForUser = 0;
    let updatedForUser = 0;

    for (const job of jobs) {
      if (!job.contactEmail) {
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

    console.log(`User ${user.email}: created=${createdForUser}, updated=${updatedForUser}`);
  }

  console.log(`Backfill complete. created=${totalCreated}, updated=${totalUpdated}`);
}

run();
