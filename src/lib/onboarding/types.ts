export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type OnboardingStepId = "welcome" | "profile" | "sources" | "first_action";

export interface OnboardingStep {
  id: OnboardingStepId;
  labelPt: string;
  labelEn: string;
  icon: string; // Lucide icon name
  route: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  completedSteps: OnboardingStepId[];
  currentStep: OnboardingStepId | null;
  totalSteps: number;
  startedAt?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    labelPt: "Entenda o sistema",
    labelEn: "Understand the system",
    icon: "User",
    route: "/app",
  },
  {
    id: "profile",
    labelPt: "Configure seu perfil",
    labelEn: "Set up your profile",
    icon: "User",
    route: "/app/settings",
  },
  {
    id: "sources",
    labelPt: "Revise suas fontes",
    labelEn: "Review your sources",
    icon: "Database",
    route: "/app/sources",
  },
  {
    id: "first_action",
    labelPt: "Explore vagas",
    labelEn: "Explore matched jobs",
    icon: "Briefcase",
    route: "/app/jobs",
  },
];

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = ONBOARDING_STEPS.map((s) => s.id);
