import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { calculateMatchScoresForUser } from "@/lib/matcher";
import { ensureUserExists, getOrCreateProfile } from "@/lib/plan";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const profile = getOrCreateProfile(userId);

    return NextResponse.json({
      ...profile,
      skills: JSON.parse(profile.skills),
      preferredContractTypes: JSON.parse(profile.preferredContractTypes),
      preferredLocations: JSON.parse(profile.preferredLocations),
      highlights: JSON.parse(profile.highlights),
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

    const userId = ensureUserExists(session);
    const profile = getOrCreateProfile(userId);
    const body = await request.json();

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
      updatedAt: new Date().toISOString(),
    };

    db.update(schema.userProfile)
      .set(updateData)
      .where(eq(schema.userProfile.id, profile.id))
      .run();

    const updatedCount = await calculateMatchScoresForUser(userId);

    return NextResponse.json({
      success: true,
      matchScoresRecalculated: updatedCount,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
