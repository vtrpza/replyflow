import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists } from "@/lib/plan";
import { runSourceSync } from "@/lib/sources/sync";

/**
 * POST /api/sync
 * Authenticated manual sync.
 * Body: { sourceId?: string, sourceFullName?: string, reparseExisting?: boolean, runDiscovery?: boolean }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const result = await runSourceSync({
      sourceId: body.sourceId ? String(body.sourceId) : undefined,
      sourceFullName: body.sourceFullName ? String(body.sourceFullName) : undefined,
      reparseExisting: !!body.reparseExisting,
      runDiscovery: body.runDiscovery === undefined ? true : !!body.runDiscovery,
      userId,
      enforceSchedule: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
