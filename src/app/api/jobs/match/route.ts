import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateMatchScoresForUser } from "@/lib/matcher";
import { ensureUserExists } from "@/lib/plan";

/**
 * POST /api/jobs/match
 * Calculate match scores for all jobs
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);

    const updatedCount = await calculateMatchScoresForUser(userId);

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    console.error("Match calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate match scores" },
      { status: 500 }
    );
  }
}
