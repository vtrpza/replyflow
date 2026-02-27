/**
 * Full scrape script - scrapes all enabled repos.
 * Run with: npx tsx src/lib/scraper/full-scrape.ts
 */
import Database from "better-sqlite3";
import path from "path";
import { GitHubScraper } from "./github";
import { parseJobBody } from "../parser/job-parser";

const DB_PATH = path.join(process.cwd(), "data", "gitjobs.db");
const sqlite = new Database(DB_PATH);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function fullScrape() {
  const scraper = new GitHubScraper();

  const rateLimit = await scraper.getRateLimit();
  console.log(
    `GitHub API rate limit: ${rateLimit.remaining}/${rateLimit.limit} (resets at ${rateLimit.resetAt})`
  );

  if (rateLimit.remaining < 30) {
    console.error("Rate limit too low, aborting.");
    process.exit(1);
  }

  // Get all enabled repos
  const repos = sqlite
    .prepare("SELECT * FROM repo_sources WHERE enabled = 1")
    .all() as Array<{
    owner: string;
    repo: string;
    fullName: string;
  }>;

  console.log(`\nScraping ${repos.length} enabled repos...\n`);

  let totalNewJobs = 0;
  const results: Array<{ repo: string; newJobs: number; total: number }> = [];

  for (const repo of repos) {
    console.log(`Scraping ${repo.fullName}...`);

    try {
      const issues = await scraper.fetchIssues(repo.owner, repo.repo);
      console.log(`  Fetched ${issues.length} open issues`);

      let newCount = 0;
      for (const issue of issues) {
        const existing = sqlite
          .prepare("SELECT id FROM jobs WHERE issue_url = ?")
          .get(issue.issueUrl);

        if (!existing) {
          const parsed = parseJobBody(issue.title, issue.body, issue.labels);
          const jobId = generateId();
          const now = new Date().toISOString();

          sqlite
            .prepare(
              `INSERT INTO jobs (
                id, issue_url, issue_number, repo_owner, repo_name, repo_full_name,
                title, body, labels, created_at, updated_at, poster_username,
                poster_avatar_url, comments_count, company, role, salary, location,
                contract_type, experience_level, tech_stack, benefits, apply_url,
                contact_email, contact_linkedin, contact_whatsapp, is_remote,
                outreach_status, fetched_at, parsed_at
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              )`
            )
            .run(
              jobId,
              issue.issueUrl,
              issue.issueNumber,
              issue.repoOwner,
              issue.repoName,
              issue.repoFullName,
              issue.title,
              issue.body,
              JSON.stringify(issue.labels),
              issue.createdAt,
              issue.updatedAt,
              issue.posterUsername,
              issue.posterAvatarUrl,
              issue.commentsCount,
              parsed.company,
              parsed.role,
              parsed.salary,
              parsed.location,
              parsed.contractType,
              parsed.experienceLevel,
              JSON.stringify(parsed.techStack),
              parsed.benefits,
              parsed.applyUrl,
              parsed.contactEmail,
              parsed.contactLinkedin,
              parsed.contactWhatsapp,
              parsed.isRemote ? 1 : 0,
              "none",
              now,
              now
            );

          newCount++;
        }
      }

      // Update repo
      sqlite
        .prepare(
          `UPDATE repo_sources SET last_scraped_at = ?, total_jobs_fetched = total_jobs_fetched + ? WHERE full_name = ?`
        )
        .run(new Date().toISOString(), newCount, repo.fullName);

      console.log(`  New: ${newCount}`);
      results.push({ repo: repo.fullName, newJobs: newCount, total: issues.length });
      totalNewJobs += newCount;
    } catch (error) {
      console.error(`  Error: ${error}`);
      results.push({ repo: repo.fullName, newJobs: 0, total: 0 });
    }
  }

  // Summary
  const totalJobs = sqlite
    .prepare("SELECT COUNT(*) as count FROM jobs")
    .get() as { count: number };
  const remoteJobs = sqlite
    .prepare("SELECT COUNT(*) as count FROM jobs WHERE is_remote = 1")
    .get() as { count: number };
  const withEmail = sqlite
    .prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE contact_email IS NOT NULL"
    )
    .get() as { count: number };

  console.log("\n=== FULL SCRAPE SUMMARY ===");
  console.log(`Repos scraped: ${repos.length}`);
  console.log(`Total new jobs: ${totalNewJobs}`);
  console.log(`Total jobs in DB: ${totalJobs.count}`);
  console.log(`Remote jobs: ${remoteJobs.count}`);
  console.log(`Jobs with email: ${withEmail.count}`);

  console.log("\nMatch scores are now calculated per-user on demand.");

  sqlite.close();
}

fullScrape().catch(console.error);
