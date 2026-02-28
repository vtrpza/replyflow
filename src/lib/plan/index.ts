/**
 * Plan enforcement + user utilities for ReplyFlow.
 * Server-side only — never import from client components.
 */

import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { runSourceDiscovery } from "@/lib/sources/discovery";
import { getPostHogClient } from "@/lib/posthog-server";

// ─── Types ──────────────────────────────────────────────────

export type PlanType = "free" | "pro";
export type FeatureKey = "drafts" | "sends" | "reveals" | "accounts";
export type SourceDailyFeature = "manual_sync" | "source_validate";
export type UpgradeFeatureKey =
  | FeatureKey
  | "sources_enabled"
  | "ats_sources_enabled"
  | "syncs_daily"
  | "source_validations_daily";
export type UpgradePeriod = "month" | "day" | "total";

export interface PlanLimits {
  reveals: number;
  drafts: number;
  sends: number;
  accounts: number;
  historyItems: number;
}

export interface SourcePlanLimits {
  enabledSources: number;
  enabledAtsSources: number;
  manualSyncPerDay: number;
  sourceValidationsPerDay: number;
}

export interface UsageInfo {
  revealsUsed: number;
  draftsUsed: number;
  sendsUsed: number;
  periodStart: string;
}

export interface SourceUsageInfo {
  dayStart: string;
  manualSyncUsed: number;
  sourceValidationsUsed: number;
}

export interface PlanInfo {
  plan: PlanType;
  limits: PlanLimits;
  usage: UsageInfo;
  sourceLimits: SourcePlanLimits;
  sourceUsage: SourceUsageInfo;
  enabledSources: number;
  enabledAtsSources: number;
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

const FREE_SOURCE_LIMITS: SourcePlanLimits = {
  enabledSources: -1,
  enabledAtsSources: -1,
  manualSyncPerDay: -1,
  sourceValidationsPerDay: -1,
};

const PRO_SOURCE_LIMITS: SourcePlanLimits = {
  enabledSources: -1,
  enabledAtsSources: -1,
  manualSyncPerDay: -1,
  sourceValidationsPerDay: -1,
};

export function getLimitsForPlan(plan: PlanType): PlanLimits {
  return plan === "pro" ? PRO_LIMITS : FREE_LIMITS;
}

export function getSourceLimitsForPlan(plan: PlanType): SourcePlanLimits {
  return plan === "pro" ? PRO_SOURCE_LIMITS : FREE_SOURCE_LIMITS;
}

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getCurrentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getCurrentDayStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isUnlimitedLimit(limit: number): boolean {
  return limit < 0;
}

/**
 * Get effective plan for a user.
 * Respects REPLYFLOW_PRE_RELEASE (all environments) and
 * REPLYFLOW_FORCE_PLAN (non-production only) env vars.
 */
export function getEffectivePlan(userId: string): PlanType {
  if (process.env.REPLYFLOW_PRE_RELEASE === "true") {
    return "pro";
  }

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

function getOrCreateSourceDailyUsage(userId: string, feature: SourceDailyFeature): number {
  const dayStart = getCurrentDayStart();

  let row = db
    .select()
    .from(schema.sourceUsageDaily)
    .where(
      and(
        eq(schema.sourceUsageDaily.userId, userId),
        eq(schema.sourceUsageDaily.feature, feature),
        eq(schema.sourceUsageDaily.dayStart, dayStart)
      )
    )
    .get();

  if (!row) {
    const now = new Date().toISOString();
    db.insert(schema.sourceUsageDaily)
      .values({
        id: generateId(),
        userId,
        feature,
        dayStart,
        used: 0,
        updatedAt: now,
      })
      .run();

    row = db
      .select()
      .from(schema.sourceUsageDaily)
      .where(
        and(
          eq(schema.sourceUsageDaily.userId, userId),
          eq(schema.sourceUsageDaily.feature, feature),
          eq(schema.sourceUsageDaily.dayStart, dayStart)
        )
      )
      .get();
  }

  return row?.used || 0;
}

function incrementSourceDailyUsage(userId: string, feature: SourceDailyFeature, cost: number): void {
  const dayStart = getCurrentDayStart();
  const now = new Date().toISOString();

  getOrCreateSourceDailyUsage(userId, feature);

  db.update(schema.sourceUsageDaily)
    .set({
      used: sql`${schema.sourceUsageDaily.used} + ${cost}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.sourceUsageDaily.userId, userId),
        eq(schema.sourceUsageDaily.feature, feature),
        eq(schema.sourceUsageDaily.dayStart, dayStart)
      )
    )
    .run();
}

export function getSourceUsageInfo(userId: string): SourceUsageInfo {
  const dayStart = getCurrentDayStart();
  const manualSyncUsed = getOrCreateSourceDailyUsage(userId, "manual_sync");
  const sourceValidationsUsed = getOrCreateSourceDailyUsage(userId, "source_validate");

  return {
    dayStart,
    manualSyncUsed,
    sourceValidationsUsed,
  };
}

export function getSourceCounts(userId: string): { enabledSources: number; enabledAtsSources: number } {
  const enabledSources = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.repoSources)
    .where(and(eq(schema.repoSources.userId, userId), eq(schema.repoSources.enabled, true)))
    .get()
    ?.count || 0;

  const enabledAtsSources = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.repoSources)
    .where(
      and(
        eq(schema.repoSources.userId, userId),
        eq(schema.repoSources.enabled, true),
        sql`${schema.repoSources.sourceType} IN ('greenhouse_board', 'lever_postings')`
      )
    )
    .get()
    ?.count || 0;

  return { enabledSources, enabledAtsSources };
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
): { ok: true } | { ok: false; error: string; limit: number; feature: UpgradeFeatureKey; period: UpgradePeriod } {
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
      period: "month",
    };
  }

  // Within limits — increment
  incrementUsage(userId, feature, cost);
  return { ok: true };
}

/**
 * Build standardized 402 response body.
 */
export function upgradeRequiredResponse(feature: UpgradeFeatureKey, limit: number, period: UpgradePeriod = "month") {
  return {
    error: "upgrade_required",
    feature,
    limit,
    period,
  };
}

export function assertWithinSourceDailyQuota(
  userId: string,
  feature: SourceDailyFeature,
  cost: number = 1
): { ok: true } | { ok: false; error: string; limit: number; feature: UpgradeFeatureKey; period: UpgradePeriod } {
  const limits = getSourceLimitsForPlan(getEffectivePlan(userId));

  const used = getOrCreateSourceDailyUsage(userId, feature);
  const limit = feature === "manual_sync" ? limits.manualSyncPerDay : limits.sourceValidationsPerDay;
  const responseFeature: UpgradeFeatureKey =
    feature === "manual_sync" ? "syncs_daily" : "source_validations_daily";

  if (isUnlimitedLimit(limit)) {
    incrementSourceDailyUsage(userId, feature, cost);
    return { ok: true };
  }

  if (used + cost > limit) {
    return {
      ok: false,
      error: "upgrade_required",
      feature: responseFeature,
      limit,
      period: "day",
    };
  }

  incrementSourceDailyUsage(userId, feature, cost);
  return { ok: true };
}

export function assertWithinSourceEnableQuota(
  userId: string,
  sourceType: string,
  enablingCount = 1
): { ok: true } | { ok: false; error: string; limit: number; feature: UpgradeFeatureKey; period: UpgradePeriod } {
  const limits = getSourceLimitsForPlan(getEffectivePlan(userId));
  const counts = getSourceCounts(userId);
  const isAtsSource = sourceType !== "github_repo";

  if (!isUnlimitedLimit(limits.enabledSources) && counts.enabledSources + enablingCount > limits.enabledSources) {
    return {
      ok: false,
      error: "upgrade_required",
      feature: "sources_enabled",
      limit: limits.enabledSources,
      period: "total",
    };
  }

  if (
    isAtsSource &&
    !isUnlimitedLimit(limits.enabledAtsSources) &&
    counts.enabledAtsSources + enablingCount > limits.enabledAtsSources
  ) {
    return {
      ok: false,
      error: "upgrade_required",
      feature: "ats_sources_enabled",
      limit: limits.enabledAtsSources,
      period: "total",
    };
  }

  return { ok: true };
}

/**
 * Get full plan info for a user (for UI display).
 */
export function getPlanInfo(userId: string): PlanInfo {
  const plan = getEffectivePlan(userId);
  const limits = getLimitsForPlan(plan);
  const usage = getOrCreateUsage(userId);
  const sourceLimits = getSourceLimitsForPlan(plan);
  const sourceUsage = getSourceUsageInfo(userId);
  const sourceCounts = getSourceCounts(userId);

  return {
    plan,
    limits,
    usage,
    sourceLimits,
    sourceUsage,
    enabledSources: sourceCounts.enabledSources,
    enabledAtsSources: sourceCounts.enabledAtsSources,
  };
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

    const phClient = getPostHogClient();
    phClient.capture({
      distinctId: requestedId,
      event: "signup_completed",
      properties: {
        email: requestedEmail,
        name: session.user.name || null,
      },
    });
    void phClient.shutdown();
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

  // Auto-provision sources for new users via discovery.
  // runSourceDiscovery is synchronous (reads JSON + SQLite inserts, ~20-50ms)
  // and idempotent (checks existence before inserting).
  const sourceCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.repoSources)
    .where(eq(schema.repoSources.userId, canonicalUserId))
    .get();

  if (!sourceCount || sourceCount.count === 0) {
    try {
      runSourceDiscovery(canonicalUserId);

      const afterCount = db
        .select({ count: sql<number>`count(*)` })
        .from(schema.repoSources)
        .where(eq(schema.repoSources.userId, canonicalUserId))
        .get();

      if (afterCount && afterCount.count > 0) {
        const phPipeline = getPostHogClient();
        phPipeline.capture({
          distinctId: canonicalUserId,
          event: "pipeline_created",
          properties: { sources_count: afterCount.count },
        });
        void phPipeline.shutdown();
      }
    } catch (e) {
      console.error("Auto-discovery failed for new user:", canonicalUserId, e);
    }
  }

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
        profileScore: 0,
        profileScoreBand: "low",
        profileScoreMissing: "[]",
        profileScoreSuggestions: "[]",
        profileScoreUpdatedAt: now,
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
