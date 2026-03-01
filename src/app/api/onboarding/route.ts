import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists } from "@/lib/plan";
import {
  getOnboardingState,
  completeOnboardingStep,
  skipOnboarding,
  ONBOARDING_STEP_IDS,
} from "@/lib/onboarding";
import type { OnboardingStepId } from "@/lib/onboarding";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const state = getOnboardingState(userId);
    return NextResponse.json(state);
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ error: "Failed to fetch onboarding state" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const body = await request.json();
    const { action, step } = body as { action: string; step?: string };

    if (action === "complete_step") {
      if (!step || !ONBOARDING_STEP_IDS.includes(step as OnboardingStepId)) {
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
      }
      const state = completeOnboardingStep(userId, step as OnboardingStepId);
      return NextResponse.json(state);
    }

    if (action === "skip") {
      const state = skipOnboarding(userId);
      return NextResponse.json(state);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
  }
}
