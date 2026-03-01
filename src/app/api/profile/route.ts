import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { calculateMatchScoresForUser } from "@/lib/matcher";
import { ensureUserExists, getOrCreateProfile } from "@/lib/plan";
import { calculateProfileScore } from "@/lib/profile/scoring";
import type { UserProfile } from "@/lib/types";

function parseArray(value: string): string[] {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function buildScoringProfile(profile: typeof schema.userProfile.$inferSelect): UserProfile {
  const profileScoreBand = profile.profileScoreBand === "high" || profile.profileScoreBand === "medium"
    ? profile.profileScoreBand
    : "low";

  return {
    ...profile,
    skills: parseArray(profile.skills),
    experienceLevel: profile.experienceLevel as UserProfile["experienceLevel"],
    preferredContractTypes: parseArray(profile.preferredContractTypes) as UserProfile["preferredContractTypes"],
    preferredLocations: parseArray(profile.preferredLocations),
    highlights: parseArray(profile.highlights),
    profileScoreBand,
    profileScoreMissing: parseArray(profile.profileScoreMissing),
    profileScoreSuggestions: parseArray(profile.profileScoreSuggestions),
  };
}

function shouldAutoHealScore(profile: typeof schema.userProfile.$inferSelect): boolean {
  if (profile.profileScore === 0) {
    return true;
  }
  if (!profile.profileScoreUpdatedAt) {
    return true;
  }
  return false;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);
    let profile = getOrCreateProfile(userId);

    if (shouldAutoHealScore(profile)) {
      const scoringProfile = buildScoringProfile(profile);
      const freshScore = calculateProfileScore(scoringProfile);
      const now = new Date().toISOString();

      db.update(schema.userProfile)
        .set({
          profileScore: freshScore.score,
          profileScoreBand: freshScore.band,
          profileScoreMissing: JSON.stringify(freshScore.missing),
          profileScoreSuggestions: JSON.stringify(freshScore.suggestions),
          profileScoreUpdatedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.userProfile.id, profile.id))
        .run();

      profile = getOrCreateProfile(userId);
    }

    return NextResponse.json({
      ...profile,
      skills: parseArray(profile.skills),
      preferredContractTypes: parseArray(profile.preferredContractTypes),
      preferredLocations: parseArray(profile.preferredLocations),
      highlights: parseArray(profile.highlights),
      profileScore: {
        score: profile.profileScore,
        band: profile.profileScoreBand,
        missing: parseArray(profile.profileScoreMissing),
        suggestions: parseArray(profile.profileScoreSuggestions),
        updatedAt: profile.profileScoreUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);
    const profile = getOrCreateProfile(userId);
    const body = await request.json();

    const profileForScoring: UserProfile = {
      ...profile,
      name: body.name || "",
      email: body.email || "",
      phone: body.phone || null,
      linkedinUrl: body.linkedinUrl || null,
      githubUrl: body.githubUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      resumeUrl: body.resumeUrl || null,
      skills: body.skills || [],
      experienceYears: body.experienceYears || 0,
      experienceLevel: body.experienceLevel || "Pleno",
      preferredContractTypes: body.preferredContractTypes || ["CLT", "PJ"],
      preferredLocations: body.preferredLocations || [],
      preferRemote: body.preferRemote !== undefined ? body.preferRemote : true,
      minSalary: body.minSalary || null,
      maxSalary: body.maxSalary || null,
      bio: body.bio || null,
      highlights: body.highlights || [],
      profileScore: 0,
      profileScoreBand: "low",
      profileScoreMissing: [],
      profileScoreSuggestions: [],
      profileScoreUpdatedAt: null,
    };
    const profileScore = calculateProfileScore(profileForScoring);
    const now = new Date().toISOString();

    const updateData = {
      name: body.name || "",
      email: body.email || "",
      phone: body.phone || null,
      linkedinUrl: body.linkedinUrl || null,
      githubUrl: body.githubUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      resumeUrl: body.resumeUrl || null,
      skills: JSON.stringify(body.skills || []),
      experienceYears: body.experienceYears || 0,
      experienceLevel: body.experienceLevel || "Pleno",
      preferredContractTypes: JSON.stringify(body.preferredContractTypes || ["CLT", "PJ"]),
      preferredLocations: JSON.stringify(body.preferredLocations || []),
      preferRemote: body.preferRemote !== undefined ? body.preferRemote : true,
      minSalary: body.minSalary || null,
      maxSalary: body.maxSalary || null,
      bio: body.bio || null,
      highlights: JSON.stringify(body.highlights || []),
      profileScore: profileScore.score,
      profileScoreBand: profileScore.band,
      profileScoreMissing: JSON.stringify(profileScore.missing),
      profileScoreSuggestions: JSON.stringify(profileScore.suggestions),
      profileScoreUpdatedAt: now,
      updatedAt: now,
    };

    db.update(schema.userProfile)
      .set(updateData)
      .where(eq(schema.userProfile.id, profile.id))
      .run();

    const updatedCount = await calculateMatchScoresForUser(userId);

    return NextResponse.json({
      success: true,
      matchScoresRecalculated: updatedCount,
      profileScore,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
