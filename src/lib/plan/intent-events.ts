import { db, schema } from "@/lib/db";
import type { PlanType, UpgradeFeatureKey, UpgradePeriod } from "@/lib/plan";

export type PlanIntentEventType =
  | "core_action_sync"
  | "core_action_validate"
  | "core_action_source_add"
  | "core_action_source_enable"
  | "core_action_reveal"
  | "core_action_draft"
  | "core_action_send"
  | "upgrade_blocked"
  | "upgrade_cta_click";

type PlanIntentMetadataValue = string | number | boolean | null;

export interface PlanIntentMetadata {
  [key: string]: PlanIntentMetadataValue;
}

interface RecordPlanIntentEventInput {
  userId: string;
  plan: PlanType;
  eventType: PlanIntentEventType;
  route: string;
  feature?: string;
  metadata?: PlanIntentMetadata;
}

interface RecordUpgradeBlockedIntentInput {
  userId: string;
  plan: PlanType;
  feature: UpgradeFeatureKey;
  route: string;
  limit: number;
  period: UpgradePeriod;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function serializeMetadata(metadata: PlanIntentMetadata | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "{}";
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return "{}";
  }
}

export function recordPlanIntentEvent(input: RecordPlanIntentEventInput): void {
  try {
    db.insert(schema.planIntentEvents)
      .values({
        id: generateId(),
        userId: input.userId,
        plan: input.plan,
        eventType: input.eventType,
        feature: input.feature || null,
        route: input.route,
        metadataJson: serializeMetadata(input.metadata),
        createdAt: new Date().toISOString(),
      })
      .run();
  } catch (error) {
    console.error("Plan intent telemetry error:", error);
  }
}

export function recordUpgradeBlockedIntent(input: RecordUpgradeBlockedIntentInput): void {
  recordPlanIntentEvent({
    userId: input.userId,
    plan: input.plan,
    eventType: "upgrade_blocked",
    route: input.route,
    feature: input.feature,
    metadata: {
      limit: input.limit,
      period: input.period,
    },
  });
}

