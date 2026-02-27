import type { UserProfile } from "@/lib/types";

export interface ProfileScoreResult {
  score: number;
  band: "low" | "medium" | "high";
  missing: string[];
  suggestions: string[];
}

function hasText(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateProfileScore(profile: UserProfile): ProfileScoreResult {
  let score = 0;
  const missing: string[] = [];
  const suggestions: string[] = [];

  // Identity + contact readiness (30)
  if (hasText(profile.name)) score += 8;
  else {
    missing.push("name");
    suggestions.push("Add your full name.");
  }

  if (hasText(profile.email)) score += 8;
  else {
    missing.push("email");
    suggestions.push("Add your preferred contact email.");
  }

  if (hasText(profile.linkedinUrl)) score += 7;
  else {
    missing.push("linkedin");
    suggestions.push("Add your LinkedIn URL for recruiter trust.");
  }

  if (hasText(profile.githubUrl) || hasText(profile.portfolioUrl)) score += 7;
  else {
    missing.push("portfolio_or_github");
    suggestions.push("Add GitHub or portfolio URL.");
  }

  // Match quality signals (40)
  if (profile.skills.length >= 8) score += 16;
  else if (profile.skills.length >= 4) score += 10;
  else if (profile.skills.length > 0) score += 5;
  else {
    missing.push("skills");
    suggestions.push("Add at least 5-8 core skills.");
  }

  if (profile.experienceYears > 0) score += 8;
  else {
    missing.push("experience_years");
    suggestions.push("Set your years of experience.");
  }

  if (hasText(profile.experienceLevel)) score += 8;

  if (profile.preferredContractTypes.length > 0) score += 4;
  else {
    missing.push("preferred_contract_types");
    suggestions.push("Select at least one preferred contract type.");
  }

  if (profile.preferRemote || profile.preferredLocations.length > 0) score += 4;
  else {
    missing.push("location_preference");
    suggestions.push("Set remote preference or preferred locations.");
  }

  // Outreach readiness (30)
  if (profile.highlights.length >= 3) score += 14;
  else if (profile.highlights.length > 0) score += 8;
  else {
    missing.push("highlights");
    suggestions.push("Add 2-3 concise achievement highlights.");
  }

  if (hasText(profile.bio)) score += 8;
  else {
    missing.push("bio");
    suggestions.push("Write a short professional bio.");
  }

  if (hasText(profile.resumeUrl)) score += 8;
  else {
    missing.push("resume_url");
    suggestions.push("Add a resume URL for outreach workflows.");
  }

  const normalizedScore = clamp(Math.round(score));
  const band: "low" | "medium" | "high" = normalizedScore >= 75 ? "high" : normalizedScore >= 45 ? "medium" : "low";

  return {
    score: normalizedScore,
    band,
    missing,
    suggestions: suggestions.slice(0, 6),
  };
}
