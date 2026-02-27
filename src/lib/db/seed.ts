/**
 * Seed the repo_sources table from the brazilian-job-ecosystem.json file.
 * Run with: npx tsx src/lib/db/seed.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "gitjobs.db");
const ECOSYSTEM_PATH = path.join(
  process.cwd(),
  "data",
  "brazilian-job-ecosystem.json"
);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function seed() {
  console.log("Reading ecosystem data...");
  const ecosystem = JSON.parse(fs.readFileSync(ECOSYSTEM_PATH, "utf-8"));

  // Create tables
  console.log("Creating tables...");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      issue_url TEXT NOT NULL UNIQUE,
      issue_number INTEGER NOT NULL,
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      repo_full_name TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      labels TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      poster_username TEXT NOT NULL,
      poster_avatar_url TEXT,
      comments_count INTEGER NOT NULL DEFAULT 0,
      company TEXT,
      role TEXT,
      salary TEXT,
      location TEXT,
      contract_type TEXT,
      experience_level TEXT,
      tech_stack TEXT NOT NULL DEFAULT '[]',
      benefits TEXT,
      apply_url TEXT,
      contact_email TEXT,
      contact_linkedin TEXT,
      contact_whatsapp TEXT,
      is_remote INTEGER NOT NULL DEFAULT 0,
      match_score REAL,
      outreach_status TEXT NOT NULL DEFAULT 'none',
      fetched_at TEXT NOT NULL,
      parsed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_url TEXT,
      resume_url TEXT,
      skills TEXT NOT NULL DEFAULT '[]',
      experience_years INTEGER NOT NULL DEFAULT 0,
      experience_level TEXT NOT NULL DEFAULT 'Pleno',
      preferred_contract_types TEXT NOT NULL DEFAULT '["CLT","PJ"]',
      preferred_locations TEXT NOT NULL DEFAULT '[]',
      prefer_remote INTEGER NOT NULL DEFAULT 1,
      min_salary REAL,
      max_salary REAL,
      bio TEXT,
      highlights TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      status TEXT NOT NULL DEFAULT 'none',
      email_subject TEXT,
      email_body TEXT,
      sent_at TEXT,
      followed_up_at TEXT,
      replied_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS repo_sources (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      full_name TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      technology TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_scraped_at TEXT,
      total_jobs_fetched INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id TEXT PRIMARY KEY,
      repo_full_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      new_jobs_found INTEGER NOT NULL DEFAULT 0,
      total_issues_fetched INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running',
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_repo ON jobs(repo_full_name);
    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_outreach ON jobs(outreach_status);
    CREATE INDEX IF NOT EXISTS idx_jobs_match ON jobs(match_score);
    CREATE INDEX IF NOT EXISTS idx_outreach_job ON outreach_records(job_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_records(status);
  `);

  // Seed repo sources from byCategory
  console.log("Seeding repo sources from byCategory...");
  for (const repo of ecosystem.githubRepos.byCategory) {
    const existing = sqlite
      .prepare("SELECT id FROM repo_sources WHERE full_name = ?")
      .get(repo.fullName);
    if (!existing) {
      db.insert(schema.repoSources)
        .values({
          id: generateId(),
          owner: repo.owner,
          repo: repo.repo,
          fullName: repo.fullName,
          url: repo.url,
          category: repo.category,
          technology: null,
          enabled: true,
          lastScrapedAt: null,
          totalJobsFetched: 0,
        })
        .run();
      console.log(`  Added: ${repo.fullName} (${repo.category})`);
    }
  }

  // Seed repo sources from byTechnology
  console.log("Seeding repo sources from byTechnology...");
  for (const repo of ecosystem.githubRepos.byTechnology) {
    const existing = sqlite
      .prepare("SELECT id FROM repo_sources WHERE full_name = ?")
      .get(repo.fullName);
    if (!existing) {
      db.insert(schema.repoSources)
        .values({
          id: generateId(),
          owner: repo.owner,
          repo: repo.repo,
          fullName: repo.fullName,
          url: repo.url,
          category: "technology",
          technology: repo.technology,
          enabled: true,
          lastScrapedAt: null,
          totalJobsFetched: 0,
        })
        .run();
      console.log(`  Added: ${repo.fullName} (${repo.technology})`);
    }
  }

  // Seed aggregator repos that use issues for job postings
  console.log("Seeding aggregator repos...");
  const issueBasedAggregators = [
    "Empregos-dev/Vagas-dev",
    "seujobtech/vagas",
    "techmagiccube/vagas",
  ];
  for (const agg of ecosystem.githubRepos.aggregatorsAndMeta) {
    if (issueBasedAggregators.includes(agg.fullName)) {
      const existing = sqlite
        .prepare("SELECT id FROM repo_sources WHERE full_name = ?")
        .get(agg.fullName);
      if (!existing) {
        db.insert(schema.repoSources)
          .values({
            id: generateId(),
            owner: agg.fullName.split("/")[0],
            repo: agg.fullName.split("/")[1],
            fullName: agg.fullName,
            url: agg.url,
            category: "general",
            technology: null,
            enabled: true,
            lastScrapedAt: null,
            totalJobsFetched: 0,
          })
          .run();
        console.log(`  Added: ${agg.fullName} (aggregator)`);
      }
    }
  }

  // Seed Portugal repos (bonus - Portuguese-speaking market)
  console.log("Seeding Portugal repos...");
  for (const repo of ecosystem.githubRepos.portugal) {
    const existing = sqlite
      .prepare("SELECT id FROM repo_sources WHERE full_name = ?")
      .get(repo.fullName);
    if (!existing) {
      db.insert(schema.repoSources)
        .values({
          id: generateId(),
          owner: repo.fullName.split("/")[0],
          repo: repo.fullName.split("/")[1],
          fullName: repo.fullName,
          url: repo.url,
          category: "portugal",
          technology: null,
          enabled: false, // disabled by default, user can enable
          lastScrapedAt: null,
          totalJobsFetched: 0,
        })
        .run();
      console.log(`  Added: ${repo.fullName} (portugal - disabled)`);
    }
  }

  const repoCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM repo_sources")
    .get() as { count: number };
  console.log(`\nDone! ${repoCount.count} repo sources seeded.`);

  sqlite.close();
}

seed().catch(console.error);
