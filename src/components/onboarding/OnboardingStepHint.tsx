"use client";

import { useI18n } from "@/lib/i18n";
import { useOnboarding } from "./OnboardingProvider";
import type { OnboardingStepId } from "@/lib/onboarding/types";

interface OnboardingStepHintProps {
  stepId: OnboardingStepId;
  showMarkDone?: boolean;
}

export function OnboardingStepHint({ stepId, showMarkDone = false }: OnboardingStepHintProps) {
  const { t } = useI18n();
  const { state, completeStep, isOnboarding } = useOnboarding();

  if (!isOnboarding) return null;
  if (state.currentStep !== stepId) return null;
  if (state.completedSteps.includes(stepId)) return null;

  const hintKey: Record<OnboardingStepId, string> = {
    welcome: "",
    profile: "onboarding.hint.profile",
    sources: "onboarding.hint.sources",
    first_action: "onboarding.hint.jobs",
  };

  const key = hintKey[stepId];
  if (!key) return null;

  return (
    <div
      className="mb-4 rounded-lg border px-4 py-3 flex items-center justify-between gap-4"
      style={{
        borderColor: "rgba(34, 211, 238, 0.3)",
        background: "rgba(34, 211, 238, 0.05)",
      }}
    >
      <p className="text-sm text-cyan-200">{t(key)}</p>
      {showMarkDone && (
        <button
          onClick={() => completeStep(stepId)}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium shrink-0 whitespace-nowrap"
        >
          {t("onboarding.hint.markDone")}
        </button>
      )}
    </div>
  );
}
