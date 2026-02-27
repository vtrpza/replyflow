import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { db, DB_PATH } from "./index";

const migrationsFolder = path.join(process.cwd(), "drizzle");

console.log(`Running migrations on ${DB_PATH}...`);
console.log(`Migrations folder: ${migrationsFolder}`);
migrate(db, { migrationsFolder });
console.log("Migrations complete!");
