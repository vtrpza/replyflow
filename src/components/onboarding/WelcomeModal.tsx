"use client";

import { User, Database, Briefcase, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useOnboarding } from "./OnboardingProvider";
import type { OnboardingStepId } from "@/lib/onboarding/types";

const STEP_ICONS: Record<OnboardingStepId, React.ReactNode> = {
  welcome: <User className="w-5 h-5" />,
  profile: <User className="w-5 h-5" />,
  sources: <Database className="w-5 h-5" />,
  first_action: <Briefcase className="w-5 h-5" />,
};

const STEP_KEYS: OnboardingStepId[] = ["welcome", "profile", "sources", "first_action"];

export function WelcomeModal() {
  const { t } = useI18n();
  const { state, completeStep, skip } = useOnboarding();

  if (state.status !== "not_started") return null;

  const handleStart = () => {
    completeStep("welcome");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border p-8"
        style={{
          borderColor: "var(--rf-border)",
          background: "linear-gradient(180deg, rgba(15, 22, 33, 0.98) 0%, rgba(11, 15, 20, 0.98) 100%)",
        }}
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "var(--rf-gradient)" }}
          >
            <Mail className="w-6 h-6 text-[var(--rf-bg)]" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {t("onboarding.welcome.title")}
          </h2>
          <p className="text-sm text-[var(--rf-muted)] mt-2">
            {t("onboarding.welcome.subtitle")}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {STEP_KEYS.map((stepId, idx) => (
            <div
              key={stepId}
              className="flex items-center gap-4 rounded-xl border px-4 py-3"
              style={{
                borderColor: "var(--rf-border)",
                background: "rgba(11, 15, 20, 0.6)",
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-300 shrink-0">
                {STEP_ICONS[stepId]}
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-200 font-medium">
                  <span className="text-[var(--rf-muted)] mr-2">{idx + 1}.</span>
                  {t(`onboarding.welcome.step.${stepId}`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--rf-bg)] hover:opacity-90 transition-opacity"
            style={{ background: "var(--rf-gradient)" }}
          >
            {t("onboarding.welcome.cta")}
          </button>
          <button
            onClick={skip}
            className="w-full py-2 text-sm text-[var(--rf-muted)] hover:text-zinc-300 transition-colors"
          >
            {t("onboarding.welcome.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
