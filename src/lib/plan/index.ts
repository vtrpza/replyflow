/**
 * Plan enforcement + user utilities for ReplyFlow.
 * Server-side only — never import from client components.
 */

import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import type { Session } from "next-auth";

// ─── Types ──────────────────────────────────────────────────

export type PlanType = "free" | "pro";
export type FeatureKey = "drafts" | "sends" | "reveals" | "accounts";

export interface PlanLimits {
  reveals: number;
  drafts: number;
  sends: number;
  accounts: number;
  historyItems: number;
}

export interface UsageInfo {
  revealsUsed: number;
  draftsUsed: number;
  sendsUsed: number;
  periodStart: string;
}

export interface PlanInfo {
  plan: PlanType;
  limits: PlanLimits;
  usage: UsageInfo;
}

// ─── Constants ──────────────────────────────────────────────

const FREE_LIMITS: PlanLimits = {
  reveals: 50,
  drafts: 30,
  sends: 10,
  accounts: 1,
  historyItems: 30,
};

const PRO_LIMITS: PlanLimits = {
  reveals: -1,
  drafts: -1,
  sends: -1,
  accounts: -1,
  historyItems: -1,
};

export function getLimitsForPlan(plan: PlanType): PlanLimits {
  return plan === "pro" ? PRO_LIMITS : FREE_LIMITS;
}

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getCurrentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Get effective plan for a user.
 * Respects REPLYFLOW_FORCE_PLAN env var in non-production environments.
 */
export function getEffectivePlan(userId: string): PlanType {
  // Dev override
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPLYFLOW_FORCE_PLAN === "pro"
  ) {
    return "pro";
  }

  const row = db
    .select()
    .from(schema.userPlan)
    .where(eq(schema.userPlan.userId, userId))
    .get();

  if (!row) return "free";

  // Check expiry
  if (row.planExpiresAt && new Date(row.planExpiresAt) < new Date()) {
    return "free";
  }

  return row.plan as PlanType;
}

/**
 * Get or create monthly usage counters for the user.
 */
export function getOrCreateUsage(userId: string): UsageInfo {
  const periodStart = getCurrentPeriodStart();

  let usage = db
    .select()
    .from(schema.usageCounters)
    .where(
      and(
        eq(schema.usageCounters.userId, userId),
        eq(schema.usageCounters.periodStart, periodStart)
      )
    )
    .get();

  if (!usage) {
    const now = new Date().toISOString();
    db.insert(schema.usageCounters)
      .values({
        id: generateId(),
        userId,
        periodStart,
        revealsUsed: 0,
        draftsUsed: 0,
        sendsUsed: 0,
        updatedAt: now,
      })
      .run();

    usage = db
      .select()
      .from(schema.usageCounters)
      .where(
        and(
          eq(schema.usageCounters.userId, userId),
          eq(schema.usageCounters.periodStart, periodStart)
        )
      )
      .get();
  }

  return {
    revealsUsed: usage!.revealsUsed,
    draftsUsed: usage!.draftsUsed,
    sendsUsed: usage!.sendsUsed,
    periodStart,
  };
}

function incrementUsage(userId: string, feature: FeatureKey, cost: number): void {
  if (feature === "accounts") return; // accounts don't get incremented

  const periodStart = getCurrentPeriodStart();
  const now = new Date().toISOString();

  // Ensure row exists
  getOrCreateUsage(userId);

  // Map feature to column-specific update
  if (feature === "reveals") {
    db.update(schema.usageCounters)
      .set({
        revealsUsed: sql`${schema.usageCounters.revealsUsed} + ${cost}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.usageCounters.userId, userId),
          eq(schema.usageCounters.periodStart, periodStart)
        )
      )
      .run();
  } else if (feature === "drafts") {
    db.update(schema.usageCounters)
      .set({
        draftsUsed: sql`${schema.usageCounters.draftsUsed} + ${cost}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.usageCounters.userId, userId),
          eq(schema.usageCounters.periodStart, periodStart)
        )
      )
      .run();
  } else if (feature === "sends") {
    db.update(schema.usageCounters)
      .set({
        sendsUsed: sql`${schema.usageCounters.sendsUsed} + ${cost}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.usageCounters.userId, userId),
          eq(schema.usageCounters.periodStart, periodStart)
        )
      )
      .run();
  }
}

/**
 * Check if a user is within plan limits for a feature.
 * If within limits, increments usage and returns { ok: true }.
 * If exceeded, returns { ok: false, ... } with 402 info.
 */
export function assertWithinPlan(
  userId: string,
  feature: FeatureKey,
  cost: number = 1
): { ok: true } | { ok: false; error: string; limit: number; feature: FeatureKey } {
  const plan = getEffectivePlan(userId);
  const limits = getLimitsForPlan(plan);

  if (plan === "pro") {
    // Pro: unlimited — still increment for analytics but never block
    incrementUsage(userId, feature, cost);
    return { ok: true };
  }

  const usage = getOrCreateUsage(userId);
  const featureMap: Record<FeatureKey, { used: number; limit: number }> = {
    reveals: { used: usage.revealsUsed, limit: limits.reveals },
    drafts: { used: usage.draftsUsed, limit: limits.drafts },
    sends: { used: usage.sendsUsed, limit: limits.sends },
    accounts: { used: 0, limit: limits.accounts }, // checked differently
  };

  const { used, limit } = featureMap[feature];

  if (used + cost > limit) {
    return {
      ok: false,
      error: "upgrade_required",
      feature,
      limit,
    };
  }

  // Within limits — increment
  incrementUsage(userId, feature, cost);
  return { ok: true };
}

/**
 * Build standardized 402 response body.
 */
export function upgradeRequiredResponse(feature: FeatureKey, limit: number) {
  return {
    error: "upgrade_required",
    feature,
    limit,
    period: "month",
  };
}

/**
 * Get full plan info for a user (for UI display).
 */
export function getPlanInfo(userId: string): PlanInfo {
  const plan = getEffectivePlan(userId);
  const limits = getLimitsForPlan(plan);
  const usage = getOrCreateUsage(userId);

  return { plan, limits, usage };
}

/**
 * Ensure user exists in the users table.
 * Upserts using session data so FK targets exist even without DB adapter.
 */
export function ensureUserExists(session: Session): string {
  if (!session?.user?.id) {
    return "";
  }

  const now = new Date().toISOString();
  const requestedId = session.user.id;
  const requestedEmail = session.user.email || `${requestedId}@unknown.local`;

  const existingById = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, requestedId))
    .get();

  const existingByEmail = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, requestedEmail))
    .get();

  // Existing user found by email but with a different ID.
  // Keep canonical DB ID to avoid UNIQUE(email) crashes and user duplication.
  let canonicalUserId = requestedId;
  if (existingByEmail && existingByEmail.id !== requestedId) {
    canonicalUserId = existingByEmail.id;

    db.update(schema.users)
      .set({
        name: session.user.name || existingByEmail.name,
        image: session.user.image || existingByEmail.image,
        updatedAt: now,
      })
      .where(eq(schema.users.id, existingByEmail.id))
      .run();
  } else if (!existingById) {
    db.insert(schema.users)
      .values({
        id: requestedId,
        name: session.user.name || null,
        email: requestedEmail,
        image: session.user.image || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } else {
    const safeEmail =
      existingByEmail && existingByEmail.id !== existingById.id
        ? existingById.email
        : requestedEmail;

    db.update(schema.users)
      .set({
        name: session.user.name || existingById.name,
        email: safeEmail,
        image: session.user.image || existingById.image,
        updatedAt: now,
      })
      .where(eq(schema.users.id, existingById.id))
      .run();
  }

  db.insert(schema.userPlan)
    .values({
      userId: canonicalUserId,
      plan: "free",
      planStartedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();

  // Keep caller/session aligned with canonical id in this request lifecycle.
  session.user.id = canonicalUserId;

  return canonicalUserId;
}

/**
 * Get or create user profile for the authenticated user.
 */
export function getOrCreateProfile(userId: string) {
  let profile = db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .get();

  if (!profile) {
    const now = new Date().toISOString();
    const id = generateId();
    db.insert(schema.userProfile)
      .values({
        id,
        userId,
        name: "",
        email: "",
        skills: "[]",
        experienceYears: 0,
        experienceLevel: "Pleno",
        preferredContractTypes: '["CLT","PJ"]',
        preferredLocations: "[]",
        preferRemote: true,
        highlights: "[]",
        updatedAt: now,
      })
      .run();

    profile = db
      .select()
      .from(schema.userProfile)
      .where(eq(schema.userProfile.userId, userId))
      .get();
  }

  return profile!;
}
