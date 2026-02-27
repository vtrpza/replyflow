import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseJobBody } from "@/lib/parser/job-parser";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";
import { getSourceConnector } from "@/lib/sources/connectors";
import { computeSourceHealth } from "@/lib/sources/health";
import { runSourceDiscovery } from "@/lib/sources/discovery";
import type { SourceRecord } from "@/lib/sources/types";
import type { SourceType } from "@/lib/types";

interface RunSourceSyncOptions {
  sourceId?: string;
  sourceFullName?: string;
  reparseExisting?: boolean;
  userId?: string;
  enforceSchedule?: boolean;
  runDiscovery?: boolean;
}

interface SyncResultItem {
  source: string;
  status: "completed" | "failed";
  newJobs: number;
  totalFetched: number;
  duplicates: number;
  parseSuccessRatio: number;
  contactYieldRatio: number;
  error?: string;
}

interface RunSourceSyncResult {
  success: boolean;
  results: SyncResultItem[];
  totalNewJobs: number;
  discovery?: { created: number; autoEnabled: number };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + (minutes * 60 * 1000)).toISOString();
}

function shouldRunNow(source: SourceRecord): boolean {
  const now = Date.now();

  const nextSync = source.lastScrapedAt && source.syncIntervalMinutes > 0
    ? Date.parse(addMinutes(new Date(source.lastScrapedAt), source.syncIntervalMinutes))
    : null;

  if (nextSync && !Number.isNaN(nextSync) && nextSync > now) {
    return false;
  }

  return true;
}

function getTargetUserIds(userId?: string): string[] {
  if (userId) {
    return [userId];
  }
  return db.select({ id: schema.users.id }).from(schema.users).all().map((row) => row.id);
}

function syncContactEmailToUsers(input: {
  email: string | null;
  company?: string | null;
  role?: string | null;
  sourceRef?: string | null;
  sourceType: SourceType;
  jobId?: string;
  jobTitle?: string;
  userId?: string;
}) {
  if (!input.email) {
    return;
  }

  const users = getTargetUserIds(input.userId);
  for (const id of users) {
    upsertContactFromJobForUser(id, {
      email: input.email,
      company: input.company,
      position: input.role,
      sourceRef: input.sourceRef,
      sourceType: input.sourceType,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
    });
  }
}

function sourceToRecord(raw: typeof schema.repoSources.$inferSelect): SourceRecord {
  return {
    id: raw.id,
    sourceType: raw.sourceType as SourceType,
    displayName: raw.displayName,
    owner: raw.owner,
    repo: raw.repo,
    externalKey: raw.externalKey,
    fullName: raw.fullName,
    url: raw.url,
    category: raw.category,
    technology: raw.technology,
    enabled: raw.enabled,
    syncIntervalMinutes: raw.syncIntervalMinutes,
    lastScrapedAt: raw.lastScrapedAt,
  };
}

function getMinutesSince(dateIso: string | null): number {
  if (!dateIso) return 9999;
  const ts = Date.parse(dateIso);
  if (Number.isNaN(ts)) return 9999;
  return Math.max(0, (Date.now() - ts) / (1000 * 60));
}

async function runSingleSourceSync(
  sourceRaw: typeof schema.repoSources.$inferSelect,
  userId?: string
): Promise<SyncResultItem> {
  const source = sourceToRecord(sourceRaw);
  const runId = generateId();
  const runStarted = new Date().toISOString();

  db.insert(schema.sourceSyncRuns)
    .values({
      id: runId,
      sourceId: source.id,
      startedAt: runStarted,
      status: "running",
      totalFetched: 0,
      newJobs: 0,
      duplicates: 0,
    })
    .run();

  try {
    const connector = getSourceConnector(source.sourceType);
    const fetched = await connector.fetchJobs(source, source.lastScrapedAt || undefined);

    let newJobs = 0;
    let duplicates = 0;
    let parseSuccess = 0;
    let contactsFound = 0;

    for (const item of fetched.jobs) {
      let existing = db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.issueUrl, item.issueUrl))
        .get();

      if (!existing && item.externalJobId) {
        existing = db
          .select()
          .from(schema.jobs)
          .where(
            and(
              eq(schema.jobs.sourceId, source.id),
              eq(schema.jobs.externalJobId, item.externalJobId)
            )
          )
          .get();
      }

      const parsed = parseJobBody(item.title, item.body || "", item.labels);
      const applyUrl = parsed.applyUrl || item.applyUrl;
      const hasParsedSignal = !!(parsed.company || parsed.contactEmail || applyUrl || parsed.location || parsed.techStack.length > 0);
      if (hasParsedSignal) {
        parseSuccess += 1;
      }

      if (parsed.contactEmail) {
        contactsFound += 1;
      }

      if (!existing) {
        const now = new Date().toISOString();
        const jobId = generateId();

        db.insert(schema.jobs)
          .values({
            id: jobId,
            issueUrl: item.issueUrl,
            issueNumber: item.issueNumber,
            repoOwner: source.sourceType === "github_repo" ? source.owner : source.sourceType,
            repoName: source.sourceType === "github_repo" ? source.repo : (source.externalKey || source.repo),
            repoFullName: source.fullName,
            title: item.title,
            body: item.body || "",
            labels: JSON.stringify(item.labels || []),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            posterUsername: item.posterUsername || source.sourceType,
            posterAvatarUrl: item.posterAvatarUrl,
            commentsCount: item.commentsCount,
            company: parsed.company,
            role: parsed.role,
            salary: parsed.salary,
            location: parsed.location,
            contractType: parsed.contractType,
            experienceLevel: parsed.experienceLevel,
            techStack: JSON.stringify(parsed.techStack),
            benefits: parsed.benefits,
            applyUrl,
            contactEmail: parsed.contactEmail,
            contactLinkedin: parsed.contactLinkedin,
            contactWhatsapp: parsed.contactWhatsapp,
            isRemote: parsed.isRemote,
            sourceId: source.id,
            sourceType: source.sourceType,
            externalJobId: item.externalJobId,
            outreachStatus: "none",
            fetchedAt: now,
            parsedAt: now,
          })
          .run();

        syncContactEmailToUsers({
          email: parsed.contactEmail,
          company: parsed.company,
          role: parsed.role,
          sourceRef: item.issueUrl,
          sourceType: source.sourceType,
          jobId,
          jobTitle: item.title,
          userId,
        });

        newJobs += 1;
      } else {
        db.update(schema.jobs)
          .set({
            updatedAt: item.updatedAt,
            commentsCount: item.commentsCount,
            applyUrl: applyUrl || existing.applyUrl,
            contactEmail: parsed.contactEmail || existing.contactEmail,
            contactLinkedin: parsed.contactLinkedin || existing.contactLinkedin,
            contactWhatsapp: parsed.contactWhatsapp || existing.contactWhatsapp,
            sourceId: existing.sourceId || source.id,
            sourceType: source.sourceType,
            externalJobId: existing.externalJobId || item.externalJobId,
            parsedAt: new Date().toISOString(),
          })
          .where(eq(schema.jobs.id, existing.id))
          .run();

        syncContactEmailToUsers({
          email: parsed.contactEmail || existing.contactEmail,
          company: parsed.company,
          role: parsed.role,
          sourceRef: item.issueUrl,
          sourceType: source.sourceType,
          jobId: existing.id,
          jobTitle: item.title,
          userId,
        });

        duplicates += 1;
      }
    }

    const totalFetched = fetched.jobs.length;
    const parseSuccessRatio = totalFetched > 0 ? parseSuccess / totalFetched : 0;
    const contactYieldRatio = totalFetched > 0 ? contactsFound / totalFetched : 0;
    const health = computeSourceHealth({
      fetchSucceeded: true,
      hadComplianceIssue: false,
      parseSuccessRatio,
      contactYieldRatio,
      latencyMs: fetched.latencyMs,
      minutesSinceSuccess: getMinutesSince(sourceRaw.lastSuccessAt),
      consecutiveFailures: 0,
    });

    const now = new Date();
    const nextSyncAt = addMinutes(now, sourceRaw.syncIntervalMinutes + health.throttleMinutes);

    db.update(schema.sourceSyncRuns)
      .set({
        completedAt: now.toISOString(),
        status: "completed",
        httpStatus: fetched.httpStatus,
        latencyMs: fetched.latencyMs,
        totalFetched,
        newJobs,
        duplicates,
        parseSuccessRatio,
        contactYieldRatio,
      })
      .where(eq(schema.sourceSyncRuns.id, runId))
      .run();

    db.update(schema.repoSources)
      .set({
        lastScrapedAt: now.toISOString(),
        totalJobsFetched: sourceRaw.totalJobsFetched + newJobs,
        healthScore: health.score,
        healthStatus: health.status,
        healthBreakdownJson: JSON.stringify(health.breakdown),
        consecutiveFailures: 0,
        lastSuccessAt: now.toISOString(),
        lastErrorAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        nextSyncAt,
        throttledUntil: health.throttleMinutes > 0 ? addMinutes(now, health.throttleMinutes) : null,
      })
      .where(eq(schema.repoSources.id, source.id))
      .run();

    return {
      source: source.fullName,
      status: "completed",
      newJobs,
      totalFetched,
      duplicates,
      parseSuccessRatio,
      contactYieldRatio,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown source sync error";
    const now = new Date();
    const nextFailures = (sourceRaw.consecutiveFailures || 0) + 1;
    const health = computeSourceHealth({
      fetchSucceeded: false,
      hadComplianceIssue: false,
      parseSuccessRatio: 0,
      contactYieldRatio: 0,
      latencyMs: 10000,
      minutesSinceSuccess: getMinutesSince(sourceRaw.lastSuccessAt),
      consecutiveFailures: nextFailures,
    });

    db.update(schema.sourceSyncRuns)
      .set({
        completedAt: now.toISOString(),
        status: "failed",
        errorCode: "FETCH_FAILED",
        errorMessage,
      })
      .where(eq(schema.sourceSyncRuns.id, runId))
      .run();

    db.update(schema.repoSources)
      .set({
        healthScore: health.score,
        healthStatus: health.status,
        healthBreakdownJson: JSON.stringify(health.breakdown),
        consecutiveFailures: nextFailures,
        lastErrorAt: now.toISOString(),
        lastErrorCode: "FETCH_FAILED",
        lastErrorMessage: errorMessage,
        nextSyncAt: addMinutes(now, sourceRaw.syncIntervalMinutes + health.throttleMinutes),
        throttledUntil: health.throttleMinutes > 0 ? addMinutes(now, health.throttleMinutes) : null,
      })
      .where(eq(schema.repoSources.id, source.id))
      .run();

    return {
      source: source.fullName,
      status: "failed",
      newJobs: 0,
      totalFetched: 0,
      duplicates: 0,
      parseSuccessRatio: 0,
      contactYieldRatio: 0,
      error: errorMessage,
    };
  }
}

async function reparseExistingJobs(userId?: string): Promise<RunSourceSyncResult> {
  const allJobs = db.select().from(schema.jobs).all();
  let updated = 0;

  for (const job of allJobs) {
    const parsed = parseJobBody(job.title, job.body, JSON.parse(job.labels));
    if (
      parsed.contactEmail !== job.contactEmail ||
      parsed.applyUrl !== job.applyUrl ||
      parsed.contactLinkedin !== job.contactLinkedin ||
      parsed.contactWhatsapp !== job.contactWhatsapp
    ) {
      db.update(schema.jobs)
        .set({
          contactEmail: parsed.contactEmail,
          contactLinkedin: parsed.contactLinkedin,
          contactWhatsapp: parsed.contactWhatsapp,
          applyUrl: parsed.applyUrl,
          parsedAt: new Date().toISOString(),
        })
        .where(eq(schema.jobs.id, job.id))
        .run();
      updated += 1;
    }

    syncContactEmailToUsers({
      email: parsed.contactEmail || job.contactEmail,
      company: parsed.company,
      role: parsed.role,
      sourceRef: job.issueUrl,
      sourceType: (job.sourceType as SourceType) || "github_repo",
      jobId: job.id,
      jobTitle: job.title,
      userId,
    });
  }

  return {
    success: true,
    results: [
      {
        source: "reparse_existing",
        status: "completed",
        newJobs: 0,
        totalFetched: allJobs.length,
        duplicates: allJobs.length - updated,
        parseSuccessRatio: allJobs.length > 0 ? updated / allJobs.length : 0,
        contactYieldRatio: 0,
      },
    ],
    totalNewJobs: 0,
  };
}

export async function runSourceSync(options: RunSourceSyncOptions = {}): Promise<RunSourceSyncResult> {
  if (options.reparseExisting) {
    return reparseExistingJobs(options.userId);
  }

  const globalLockId = "__global__";
  const runningLock = db
    .select()
    .from(schema.sourceSyncRuns)
    .where(and(eq(schema.sourceSyncRuns.sourceId, globalLockId), eq(schema.sourceSyncRuns.status, "running")))
    .get();

  if (runningLock) {
    const startedTs = Date.parse(runningLock.startedAt);
    const ageMinutes = Number.isNaN(startedTs) ? 0 : (Date.now() - startedTs) / (1000 * 60);
    if (ageMinutes < 20) {
      throw new Error("Sync already running");
    }
  }

  const lockRunId = generateId();
  db.insert(schema.sourceSyncRuns)
    .values({
      id: lockRunId,
      sourceId: globalLockId,
      startedAt: new Date().toISOString(),
      status: "running",
    })
    .run();

  try {
    let discovery: { created: number; autoEnabled: number } | undefined;
    if (options.runDiscovery) {
      discovery = runSourceDiscovery();
    }

    let sources = db.select().from(schema.repoSources).where(eq(schema.repoSources.enabled, true)).all();

    if (options.sourceId) {
      sources = sources.filter((source) => source.id === options.sourceId);
    }
    if (options.sourceFullName) {
      sources = sources.filter((source) => source.fullName === options.sourceFullName);
    }
    if (options.enforceSchedule) {
      sources = sources.filter((source) => shouldRunNow(sourceToRecord(source)));
    }

    const results: SyncResultItem[] = [];
    for (const source of sources) {
      const result = await runSingleSourceSync(source, options.userId);
      results.push(result);
    }

    const totalNewJobs = results.reduce((sum, item) => sum + item.newJobs, 0);

    db.update(schema.sourceSyncRuns)
      .set({
        completedAt: new Date().toISOString(),
        status: "completed",
        totalFetched: results.reduce((sum, item) => sum + item.totalFetched, 0),
        newJobs: totalNewJobs,
        duplicates: results.reduce((sum, item) => sum + item.duplicates, 0),
      })
      .where(eq(schema.sourceSyncRuns.id, lockRunId))
      .run();

    return {
      success: true,
      results,
      totalNewJobs,
      discovery,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
    db.update(schema.sourceSyncRuns)
      .set({
        completedAt: new Date().toISOString(),
        status: "failed",
        errorCode: "GLOBAL_SYNC_FAILED",
        errorMessage,
      })
      .where(eq(schema.sourceSyncRuns.id, lockRunId))
      .run();

    throw error;
  }
}
