"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { OnboardingState, OnboardingStepId } from "@/lib/onboarding/types";
import { captureEvent } from "@/lib/analytics";

interface OnboardingContextValue {
  state: OnboardingState;
  isOnboarding: boolean;
  completeStep: (step: OnboardingStepId) => Promise<void>;
  skip: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultState: OnboardingState = {
  status: "completed",
  completedSteps: [],
  currentStep: null,
  totalSteps: 4,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [startedAtRef] = useState<{ value: number | null }>({ value: null });

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = (await res.json()) as OnboardingState;
        setState(data);

        if (data.status === "not_started") {
          startedAtRef.value = Date.now();
          captureEvent("onboarding_started");
        }
      }
    } catch {
      // Silently fail — onboarding is non-critical
    } finally {
      setLoaded(true);
    }
  }, [startedAtRef]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const completeStep = useCallback(
    async (step: OnboardingStepId) => {
      if (state.completedSteps.includes(step)) return;

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete_step", step }),
        });

        if (res.ok) {
          const newState = (await res.json()) as OnboardingState;
          const stepsCompleted = newState.completedSteps.length;

          captureEvent("onboarding_step_completed", {
            step,
            steps_completed: stepsCompleted,
            steps_total: 4,
          });

          if (newState.status === "completed") {
            const durationSeconds = startedAtRef.value
              ? Math.round((Date.now() - startedAtRef.value) / 1000)
              : null;
            captureEvent("onboarding_completed", {
              duration_seconds: durationSeconds,
            });
          }

          setState(newState);
        }
      } catch {
        // Silently fail
      }
    },
    [state.completedSteps, startedAtRef]
  );

  const skip = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });

      if (res.ok) {
        const newState = (await res.json()) as OnboardingState;

        captureEvent("onboarding_skipped", {
          step_at_skip: state.currentStep,
          steps_completed: state.completedSteps.length,
        });

        setState(newState);
      }
    } catch {
      // Silently fail
    }
  }, [state.currentStep, state.completedSteps.length]);

  const isOnboarding = loaded && (state.status === "not_started" || state.status === "in_progress");

  const value = useMemo(
    () => ({
      state,
      isOnboarding,
      completeStep,
      skip,
      refresh: fetchState,
    }),
    [state, isOnboarding, completeStep, skip, fetchState]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
