import { NextResponse } from "next/server";
import { runSourceSync } from "@/lib/sources/sync";

/**
 * POST /api/sync/system
 * Token-protected sync endpoint intended for external schedulers.
 */
export async function POST(request: Request) {
  try {
    const expectedToken = process.env.REPLYFLOW_SYNC_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: "REPLYFLOW_SYNC_TOKEN not configured" }, { status: 500 });
    }

    const token = request.headers.get("x-replyflow-sync-token");
    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const result = await runSourceSync({
      sourceId: body.sourceId ? String(body.sourceId) : undefined,
      sourceFullName: body.sourceFullName ? String(body.sourceFullName) : undefined,
      reparseExisting: !!body.reparseExisting,
      runDiscovery: body.runDiscovery === undefined ? true : !!body.runDiscovery,
      enforceSchedule: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("System sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "System sync failed",
      },
      { status: 500 }
    );
  }
}
