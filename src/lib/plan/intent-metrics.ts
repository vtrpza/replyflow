import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PlanIntentEventType } from "@/lib/plan/intent-events";

const CORE_ACTION_EVENT_TYPES: PlanIntentEventType[] = [
  "core_action_sync",
  "core_action_validate",
  "core_action_source_add",
  "core_action_source_enable",
  "core_action_reveal",
  "core_action_draft",
  "core_action_send",
];

const UPGRADE_INTENT_EVENT_TYPES: PlanIntentEventType[] = [
  "upgrade_blocked",
  "upgrade_cta_click",
];

export interface PlanIntentMetrics {
  from: string;
  to: string;
  activeFreeUsers: number;
  intentUsers: number;
  intentRate: number;
  totalCoreActions: number;
  totalIntentEvents: number;
}

export function getPlanIntentMetrics(from: string, to: string): PlanIntentMetrics {
  const rows = db
    .select({
      userId: schema.planIntentEvents.userId,
      eventType: schema.planIntentEvents.eventType,
    })
    .from(schema.planIntentEvents)
    .where(
      and(
        eq(schema.planIntentEvents.plan, "free"),
        gte(schema.planIntentEvents.createdAt, from),
        lte(schema.planIntentEvents.createdAt, to)
      )
    )
    .all();

  const activeUsers = new Set<string>();
  const intentUsers = new Set<string>();
  let totalCoreActions = 0;
  let totalIntentEvents = 0;

  for (const row of rows) {
    const eventType = row.eventType as PlanIntentEventType;

    if (CORE_ACTION_EVENT_TYPES.includes(eventType)) {
      activeUsers.add(row.userId);
      totalCoreActions += 1;
    }

    if (UPGRADE_INTENT_EVENT_TYPES.includes(eventType)) {
      intentUsers.add(row.userId);
      totalIntentEvents += 1;
    }
  }

  const activeFreeUsers = activeUsers.size;
  const intentUsersCount = intentUsers.size;
  const intentRate = activeFreeUsers > 0 ? intentUsersCount / activeFreeUsers : 0;

  return {
    from,
    to,
    activeFreeUsers,
    intentUsers: intentUsersCount,
    intentRate,
    totalCoreActions,
    totalIntentEvents,
  };
}

