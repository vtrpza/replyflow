"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useOnboarding } from "./OnboardingProvider";
import { ONBOARDING_STEPS } from "@/lib/onboarding/types";

export function OnboardingChecklist() {
  const { t, locale } = useI18n();
  const { state, skip, isOnboarding } = useOnboarding();
  const isPt = locale === "pt-BR";

  if (!isOnboarding) return null;

  // Show success state briefly when all steps done
  if (state.status === "completed") {
    return (
      <section
        className="rounded-2xl border p-5"
        style={{
          borderColor: "var(--rf-cyan, #22d3ee)",
          background: "linear-gradient(180deg, rgba(15, 22, 33, 0.95) 0%, rgba(11, 15, 20, 0.95) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-emerald-300">
              {t("onboarding.checklist.done.title")}
            </h3>
            <p className="text-xs text-[var(--rf-muted)] mt-1">
              {t("onboarding.checklist.done.message")}
            </p>
          </div>
          <button
            onClick={skip}
            className="text-xs text-[var(--rf-muted)] hover:text-zinc-300"
          >
            {t("onboarding.checklist.dismiss")}
          </button>
        </div>
      </section>
    );
  }

  const completed = state.completedSteps.length;
  const total = state.totalSteps;
  const progressPct = Math.round((completed / total) * 100);

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--rf-border)",
        background: "linear-gradient(180deg, rgba(15, 22, 33, 0.95) 0%, rgba(11, 15, 20, 0.95) 100%)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rf-muted)] font-mono">
            {t("onboarding.checklist.title")}
          </p>
          <p className="text-xs text-[var(--rf-muted)] mt-1">
            {t("onboarding.checklist.progress", { completed, total })}
          </p>
        </div>
        <button
          onClick={skip}
          className="text-xs text-[var(--rf-muted)] hover:text-zinc-300"
        >
          {t("onboarding.welcome.skip")}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, background: "var(--rf-gradient)" }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {ONBOARDING_STEPS.map((step) => {
          const isDone = state.completedSteps.includes(step.id);
          const isCurrent = state.currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isCurrent
                  ? "border border-cyan-500/30 bg-cyan-500/5"
                  : "border border-transparent"
              }`}
            >
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${
                  isDone
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs font-mono">
                    {ONBOARDING_STEPS.indexOf(step) + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-sm flex-1 ${
                  isDone ? "text-[var(--rf-muted)] line-through" : "text-zinc-200"
                }`}
              >
                {isPt ? step.labelPt : step.labelEn}
              </span>
              {isCurrent && (
                <Link
                  href={step.route}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium shrink-0"
                >
                  {t("onboarding.checklist.goTo")} &rarr;
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
