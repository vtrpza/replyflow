#!/usr/bin/env node

import path from "path";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gitjobs.db");
const dryRun = process.argv.includes("--dry-run");

const BLOCKED_LOCAL_PARTS = [
  "noreply",
  "no-reply",
  "do-not-reply",
  "donotreply",
  "support",
  "suporte",
  "help",
  "helpdesk",
  "admin",
  "info",
  "contact",
  "contato",
  "jobs",
  "careers",
  "career",
  "vagas",
  "talent",
  "talents",
  "recruiting",
  "recruitment",
  "rh",
  "atendimento",
  "faleconosco",
];

const BLOCKED_DOMAIN_PARTS = [
  "noreply",
  "no-reply",
  "notifications",
  "notification",
  "support",
  "help",
  "donotreply",
];

function hasBlockedPart(value, blocked) {
  return blocked.some((part) => value.includes(part));
}

function isDirectContactEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return false;

  if (localPart.includes("accommodation") || domain.includes("accommodation")) return false;
  if (localPart.includes("noreply") || localPart.includes("no-reply")) return false;
  if (hasBlockedPart(localPart, BLOCKED_LOCAL_PARTS)) return false;
  if (hasBlockedPart(domain, BLOCKED_DOMAIN_PARTS)) return false;
  if (/@github\.com$/i.test(normalized)) return false;

  return true;
}

function main() {
  console.log(
    `${dryRun ? "Dry run:" : "Running:"} cleaning generic job_sync contacts on ${dbPath}...`
  );

  const sqlite = new Database(dbPath);
  const rows = sqlite
    .prepare("SELECT id, user_id as userId, email FROM contacts WHERE source = 'job_sync'")
    .all();

  if (!rows.length) {
    console.log("No job_sync contacts found.");
    return;
  }

  const toDelete = rows.filter((row) => !isDirectContactEmail(row.email));
  if (!toDelete.length) {
    console.log(`No generic contacts found. scanned=${rows.length}`);
    return;
  }

  if (!dryRun) {
    const del = sqlite.prepare("DELETE FROM contacts WHERE id = ?");
    const tx = sqlite.transaction((items) => {
      for (const item of items) {
        del.run(item.id);
      }
    });
    tx(toDelete);
  }

  const byUser = new Map();
  for (const row of toDelete) {
    byUser.set(row.userId, (byUser.get(row.userId) || 0) + 1);
  }

  console.log(
    `${dryRun ? "Would remove" : "Removed"} ${toDelete.length} generic contacts (scanned=${rows.length}).`
  );
  for (const [userId, count] of byUser.entries()) {
    console.log(`  user=${userId} removed=${count}`);
  }
}

main();
