import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { GitHubScraper } from "@/lib/scraper/github";
import { parseJobBody } from "@/lib/parser/job-parser";
import { eq } from "drizzle-orm";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function syncContactEmailToAllUsers(input: {
  email: string | null;
  company?: string | null;
  role?: string | null;
  sourceRef?: string | null;
}) {
  if (!input.email) {
    return;
  }

  const users = db.select({ id: schema.users.id }).from(schema.users).all();
  for (const user of users) {
    upsertContactFromJobForUser(user.id, {
      email: input.email,
      company: input.company,
      position: input.role,
      sourceRef: input.sourceRef,
    });
  }
}

/**
 * POST /api/sync
 * Syncs job listings from all enabled repos (or a specific repo).
 * Body: { repoFullName?: string, reparseExisting?: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetRepo = body.repoFullName as string | undefined;
    const reparseExisting = body.reparseExisting as boolean | undefined;

    // Handle reparse-only mode
    if (reparseExisting) {
      const allJobs = db.select().from(schema.jobs).all();
      let updated = 0;
      
      for (const job of allJobs) {
        const parsed = parseJobBody(job.title, job.body, JSON.parse(job.labels));
        if (parsed.contactEmail !== job.contactEmail || parsed.applyUrl !== job.applyUrl) {
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
          updated++;
        }

        syncContactEmailToAllUsers({
          email: parsed.contactEmail,
          company: parsed.company,
          role: parsed.role,
          sourceRef: job.issueUrl,
        });
      }
      
      return NextResponse.json({
        success: true,
        message: `Reparsed ${allJobs.length} jobs, updated ${updated}`,
      });
    }

    // Get repos to sync
    let repos;
    if (targetRepo) {
      repos = db
        .select()
        .from(schema.repoSources)
        .where(eq(schema.repoSources.fullName, targetRepo))
        .all();
    } else {
      repos = db
        .select()
        .from(schema.repoSources)
        .where(eq(schema.repoSources.enabled, true))
        .all();
    }

    if (repos.length === 0) {
      return NextResponse.json(
        { error: "No repos found to sync" },
        { status: 404 }
      );
    }

    const scraper = new GitHubScraper();
    const results = [];

    for (const repo of repos) {
      const runId = generateId();
      const startedAt = new Date().toISOString();

      // Create scrape run record
      db.insert(schema.scrapeRuns)
        .values({
          id: runId,
          repoFullName: repo.fullName,
          startedAt,
          status: "running",
          newJobsFound: 0,
          totalIssuesFetched: 0,
        })
        .run();

      try {
        // Fetch issues (only new ones since last scrape)
        const issues = await scraper.fetchIssues(
          repo.owner,
          repo.repo,
          repo.lastScrapedAt || undefined
        );

        let newJobs = 0;

        for (const issue of issues) {
          // Check if we already have this issue
          const existing = db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.issueUrl, issue.issueUrl))
            .get();

          if (!existing) {
            // Parse the job body
            const parsed = parseJobBody(
              issue.title,
              issue.body,
              issue.labels
            );

            const jobId = generateId();
            const now = new Date().toISOString();

            db.insert(schema.jobs)
              .values({
                id: jobId,
                issueUrl: issue.issueUrl,
                issueNumber: issue.issueNumber,
                repoOwner: issue.repoOwner,
                repoName: issue.repoName,
                repoFullName: issue.repoFullName,
                title: issue.title,
                body: issue.body,
                labels: JSON.stringify(issue.labels),
                createdAt: issue.createdAt,
                updatedAt: issue.updatedAt,
                posterUsername: issue.posterUsername,
                posterAvatarUrl: issue.posterAvatarUrl,
                commentsCount: issue.commentsCount,
                company: parsed.company,
                role: parsed.role,
                salary: parsed.salary,
                location: parsed.location,
                contractType: parsed.contractType,
                experienceLevel: parsed.experienceLevel,
                techStack: JSON.stringify(parsed.techStack),
                benefits: parsed.benefits,
                applyUrl: parsed.applyUrl,
                contactEmail: parsed.contactEmail,
                contactLinkedin: parsed.contactLinkedin,
                contactWhatsapp: parsed.contactWhatsapp,
                isRemote: parsed.isRemote,
                outreachStatus: "none",
                fetchedAt: now,
                parsedAt: now,
              })
              .run();

            syncContactEmailToAllUsers({
              email: parsed.contactEmail,
              company: parsed.company,
              role: parsed.role,
              sourceRef: issue.issueUrl,
            });

            newJobs++;
          } else {
            // Update existing job's updated_at and comments
            db.update(schema.jobs)
              .set({
                updatedAt: issue.updatedAt,
                commentsCount: issue.commentsCount,
              })
              .where(eq(schema.jobs.issueUrl, issue.issueUrl))
              .run();
          }
        }

        // Update scrape run
        db.update(schema.scrapeRuns)
          .set({
            completedAt: new Date().toISOString(),
            newJobsFound: newJobs,
            totalIssuesFetched: issues.length,
            status: "completed",
          })
          .where(eq(schema.scrapeRuns.id, runId))
          .run();

        // Update repo source
        db.update(schema.repoSources)
          .set({
            lastScrapedAt: new Date().toISOString(),
            totalJobsFetched: repo.totalJobsFetched + newJobs,
          })
          .where(eq(schema.repoSources.id, repo.id))
          .run();

        results.push({
          repo: repo.fullName,
          status: "completed",
          newJobs,
          totalIssuesFetched: issues.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        db.update(schema.scrapeRuns)
          .set({
            completedAt: new Date().toISOString(),
            status: "failed",
            error: errorMessage,
          })
          .where(eq(schema.scrapeRuns.id, runId))
          .run();

        results.push({
          repo: repo.fullName,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalNewJobs: results.reduce(
        (sum, r) => sum + (r.newJobs || 0),
        0
      ),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
