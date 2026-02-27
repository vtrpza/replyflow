/**
 * Job matching engine (per-user).
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { UserProfile, ContractType, ExperienceLevel } from "@/lib/types";

interface JobForMatching {
  title: string;
  body: string;
  techStack: string[];
  contractType: string | null;
  experienceLevel: string | null;
  isRemote: boolean;
  location: string | null;
  salary: string | null;
  labels: string[];
}

interface MatchResult {
  score: number;
  reasons: string[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function matchJob(job: JobForMatching, profile: UserProfile): MatchResult {
  const reasons: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  const stackWeight = 50;
  totalWeight += stackWeight;

  if (profile.skills.length > 0 && job.techStack.length > 0) {
    const normalizedProfileSkills = profile.skills.map((s) => s.toLowerCase());
    const normalizedJobStack = job.techStack.map((s) => s.toLowerCase());

    const matchingSkills = normalizedProfileSkills.filter((skill) =>
      normalizedJobStack.some(
        (jobSkill) =>
          jobSkill === skill ||
          jobSkill.includes(skill) ||
          skill.includes(jobSkill) ||
          (skill === "react" && jobSkill.includes("react")) ||
          (skill === "next.js" && (jobSkill.includes("next") || jobSkill.includes("nextjs"))) ||
          ((skill === "typescript") && (jobSkill.includes("typescript") || jobSkill.includes("ts")))
      )
    );

    const coverageRatio = matchingSkills.length / Math.max(normalizedJobStack.length, 1);
    const userMatchRatio = matchingSkills.length / Math.max(normalizedProfileSkills.length, 1);
    const stackScore = ((coverageRatio + userMatchRatio) / 2) * stackWeight;
    earnedWeight += Math.min(stackScore, stackWeight);

    if (matchingSkills.length > 0) {
      reasons.push(
        `${matchingSkills.length} skills match: ${matchingSkills.slice(0, 3).join(", ")}${
          matchingSkills.length > 3 ? "..." : ""
        }`
      );
    }
  }

  const remoteWeight = 15;
  totalWeight += remoteWeight;
  if (profile.preferRemote && job.isRemote) {
    earnedWeight += remoteWeight;
    reasons.push("Remote");
  }

  const contractWeight = 15;
  totalWeight += contractWeight;
  if (job.contractType && profile.preferredContractTypes.length > 0) {
    if (profile.preferredContractTypes.includes(job.contractType as ContractType)) {
      earnedWeight += contractWeight;
      reasons.push(`Contract: ${job.contractType}`);
    }
  }

  const levelWeight = 15;
  totalWeight += levelWeight;
  if (job.experienceLevel && profile.experienceLevel) {
    const levelOrder: Record<string, number> = {
      Intern: 0,
      Junior: 1,
      Pleno: 2,
      Senior: 3,
      Lead: 4,
    };
    const jobLevel = levelOrder[job.experienceLevel] ?? 2;
    const profileLevel = levelOrder[profile.experienceLevel] ?? 2;
    const diff = jobLevel - profileLevel;

    if (diff <= 0) {
      earnedWeight += levelWeight;
      reasons.push(`Level: ${job.experienceLevel}`);
    } else if (diff === 1) {
      earnedWeight += levelWeight * 0.3;
      reasons.push(`Level stretch: ${job.experienceLevel}`);
    }
  }

  const locationWeight = 5;
  totalWeight += locationWeight;
  if (job.isRemote) {
    if (profile.preferRemote) {
      earnedWeight += locationWeight;
    }
  } else if (job.location && profile.preferredLocations.length > 0) {
    const normalizedJobLocation = job.location.toLowerCase();
    const matches = profile.preferredLocations.some((loc) =>
      normalizedJobLocation.includes(loc.toLowerCase())
    );
    if (matches) {
      earnedWeight += locationWeight;
      reasons.push(`Location: ${job.location}`);
    }
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);

  return {
    score: Math.min(score, 100),
    reasons,
  };
}

export async function calculateMatchScoresForUser(userId: string): Promise<number> {
  const profile = db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .get();

  if (!profile) {
    return 0;
  }

  const parsedProfile: UserProfile = {
    ...profile,
    skills: JSON.parse(profile.skills) as string[],
    preferredContractTypes: JSON.parse(profile.preferredContractTypes) as ContractType[],
    preferredLocations: JSON.parse(profile.preferredLocations) as string[],
    highlights: JSON.parse(profile.highlights) as string[],
    experienceLevel: profile.experienceLevel as ExperienceLevel,
  };

  const jobs = db.select().from(schema.jobs).all();

  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const job of jobs) {
    const jobForMatching: JobForMatching = {
      title: job.title,
      body: job.body,
      techStack: JSON.parse(job.techStack) as string[],
      contractType: job.contractType,
      experienceLevel: job.experienceLevel,
      isRemote: job.isRemote,
      location: job.location,
      salary: job.salary,
      labels: JSON.parse(job.labels) as string[],
    };

    const result = matchJob(jobForMatching, parsedProfile);

    db.insert(schema.jobMatchScores)
      .values({
        id: generateId(),
        userId,
        jobId: job.id,
        score: result.score,
        calculatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.jobMatchScores.userId, schema.jobMatchScores.jobId],
        set: {
          score: result.score,
          calculatedAt: now,
        },
      })
      .run();

    updatedCount++;
  }

  return updatedCount;
}
