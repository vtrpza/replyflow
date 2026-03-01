/**
 * Server-side onboarding helpers.
 * Follows the synchronous SQLite pattern of getOrCreateProfile.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { OnboardingState, OnboardingStatus, OnboardingStepId } from "./types";
import { ONBOARDING_STEP_IDS } from "./types";

export type { OnboardingState, OnboardingStatus, OnboardingStepId };
export { ONBOARDING_STEPS, ONBOARDING_STEP_IDS } from "./types";

function parseCompletedSteps(raw: string): OnboardingStepId[] {
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((s): s is OnboardingStepId =>
      ONBOARDING_STEP_IDS.includes(s as OnboardingStepId)
    );
  } catch {
    return [];
  }
}

function getNextStep(completedSteps: OnboardingStepId[]): OnboardingStepId | null {
  for (const stepId of ONBOARDING_STEP_IDS) {
    if (!completedSteps.includes(stepId)) {
      return stepId;
    }
  }
  return null;
}

export function getOnboardingState(userId: string): OnboardingState {
  const profile = db
    .select({
      onboardingStatus: schema.userProfile.onboardingStatus,
      onboardingCompletedSteps: schema.userProfile.onboardingCompletedSteps,
    })
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .get();

  if (!profile) {
    return {
      status: "not_started",
      completedSteps: [],
      currentStep: "welcome",
      totalSteps: ONBOARDING_STEP_IDS.length,
    };
  }

  const status = profile.onboardingStatus as OnboardingStatus;
  const completedSteps = parseCompletedSteps(profile.onboardingCompletedSteps);
  const currentStep = status === "completed" || status === "skipped"
    ? null
    : getNextStep(completedSteps);

  return {
    status,
    completedSteps,
    currentStep,
    totalSteps: ONBOARDING_STEP_IDS.length,
  };
}

export function completeOnboardingStep(userId: string, stepId: OnboardingStepId): OnboardingState {
  const profile = db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .get();

  if (!profile) {
    return getOnboardingState(userId);
  }

  const completedSteps = parseCompletedSteps(profile.onboardingCompletedSteps);

  if (completedSteps.includes(stepId)) {
    return getOnboardingState(userId);
  }

  completedSteps.push(stepId);
  const allDone = ONBOARDING_STEP_IDS.every((id) => completedSteps.includes(id));
  const newStatus: OnboardingStatus = allDone ? "completed" : "in_progress";

  db.update(schema.userProfile)
    .set({
      onboardingStatus: newStatus,
      onboardingCompletedSteps: JSON.stringify(completedSteps),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.userProfile.id, profile.id))
    .run();

  return getOnboardingState(userId);
}

export function skipOnboarding(userId: string): OnboardingState {
  const profile = db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .get();

  if (!profile) {
    return getOnboardingState(userId);
  }

  db.update(schema.userProfile)
    .set({
      onboardingStatus: "skipped",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.userProfile.id, profile.id))
    .run();

  return getOnboardingState(userId);
}
