/**
 * Test scrape script - scrapes a single repo to verify the pipeline.
 * Run with: npx tsx src/lib/scraper/test-scrape.ts
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

async function testScrape() {
  const scraper = new GitHubScraper();

  // Check rate limit first
  const rateLimit = await scraper.getRateLimit();
  console.log(
    `GitHub API rate limit: ${rateLimit.remaining}/${rateLimit.limit} (resets at ${rateLimit.resetAt})`
  );

  if (rateLimit.remaining < 50) {
    console.error("Rate limit too low, aborting.");
    process.exit(1);
  }

  // Test repos - most active ones
  const testRepos = [
    { owner: "frontendbr", repo: "vagas" },
    { owner: "backend-br", repo: "vagas" },
    { owner: "react-brasil", repo: "vagas" },
  ];

  let totalNewJobs = 0;

  for (const { owner, repo } of testRepos) {
    console.log(`\nScraping ${owner}/${repo}...`);

    try {
      const issues = await scraper.fetchIssues(owner, repo);
      console.log(`  Fetched ${issues.length} open issues`);

      let newCount = 0;
      for (const issue of issues) {
        // Check if already exists
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

          // Log first few parsed jobs for verification
          if (newCount <= 3) {
            console.log(`  [NEW] "${issue.title}"`);
            console.log(
              `    Company: ${parsed.company || "?"} | Role: ${parsed.role || "?"} | Remote: ${parsed.isRemote}`
            );
            console.log(
              `    Stack: ${parsed.techStack.slice(0, 5).join(", ")}${parsed.techStack.length > 5 ? "..." : ""}`
            );
            console.log(
              `    Contact: ${parsed.contactEmail || "no email"} | ${parsed.contactLinkedin || "no linkedin"}`
            );
            console.log(
              `    Salary: ${parsed.salary || "not specified"} | Contract: ${parsed.contractType || "?"} | Level: ${parsed.experienceLevel || "?"}`
            );
          }
        }
      }

      console.log(`  New jobs inserted: ${newCount}`);
      totalNewJobs += newCount;

      // Update repo source
      sqlite
        .prepare(
          `UPDATE repo_sources SET last_scraped_at = ?, total_jobs_fetched = total_jobs_fetched + ? WHERE full_name = ?`
        )
        .run(new Date().toISOString(), newCount, `${owner}/${repo}`);
    } catch (error) {
      console.error(`  Error scraping ${owner}/${repo}:`, error);
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

  console.log("\n=== SCRAPE SUMMARY ===");
  console.log(`New jobs added: ${totalNewJobs}`);
  console.log(`Total jobs in DB: ${totalJobs.count}`);
  console.log(`Remote jobs: ${remoteJobs.count}`);
  console.log(`Jobs with contact email: ${withEmail.count}`);

  sqlite.close();
}

testScrape().catch(console.error);
