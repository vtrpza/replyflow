import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    db.select({ v: sql`1` }).from(sql`sqlite_master`).limit(1).get();
    return Response.json({ status: "ok", db: "connected" });
  } catch {
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503 }
    );
  }
}
