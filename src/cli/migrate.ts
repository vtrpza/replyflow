import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function main(): void {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gitjobs.db");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite);

  // Keep logs terse but actionable for Fly deploy/debug.
  console.log(`[migrate] db=${dbPath}`);
  console.log(`[migrate] folder=${migrationsFolder}`);

  migrate(db, { migrationsFolder });

  sqlite.close();
  console.log("[migrate] complete");
}

try {
  main();
} catch (error: unknown) {
  console.error("[migrate] failed", error);
  process.exitCode = 1;
}
