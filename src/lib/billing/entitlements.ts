import { addDays } from "date-fns";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getBillingConfig } from "@/lib/billing/config";
import type { BillingPaymentStatus, BillingSubscriptionStatus } from "@/lib/billing/types";

function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;

  const parsed = input.length <= 10
    ? new Date(`${input}T23:59:59.999Z`)
    : new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function mapProviderSubscriptionStatus(status: string | null | undefined): BillingSubscriptionStatus {
  const normalized = (status || "").trim().toUpperCase();

  if (["ACTIVE", "ACTIVATED"].includes(normalized)) return "active";
  if (["OVERDUE", "PAST_DUE", "INACTIVE"].includes(normalized)) return "past_due";
  if (["CANCELED", "CANCELLED", "DELETED"].includes(normalized)) return "canceled";
  if (["EXPIRED"].includes(normalized)) return "expired";

  return "pending";
}

export function mapProviderPaymentStatus(status: string | null | undefined): BillingPaymentStatus {
  const normalized = (status || "").trim().toUpperCase();

  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(normalized)) return "paid";
  if (["OVERDUE"].includes(normalized)) return "overdue";
  if (["DELETED", "CANCELED", "CANCELLED"].includes(normalized)) return "canceled";
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(normalized)) return "refunded";

  return "pending";
}

export function subscriptionStatusFromEvent(eventType: string): BillingSubscriptionStatus | null {
  const normalized = eventType.trim().toUpperCase();

  if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(normalized)) return "active";
  if (["PAYMENT_OVERDUE"].includes(normalized)) return "past_due";
  if (["PAYMENT_DELETED"].includes(normalized)) return "canceled";

  return null;
}

export function resolveEntitlement(input: {
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodEnd: string | null;
}): { entitlementPlan: "free" | "pro"; planExpiresAt: string | null } {
  const now = new Date();
  const periodEnd = parseDate(input.currentPeriodEnd);
  const config = getBillingConfig();

  if (input.subscriptionStatus === "active") {
    return {
      entitlementPlan: "pro",
      planExpiresAt: periodEnd?.toISOString() || null,
    };
  }

  if (input.subscriptionStatus === "canceled") {
    if (periodEnd && periodEnd >= now) {
      return {
        entitlementPlan: "pro",
        planExpiresAt: periodEnd.toISOString(),
      };
    }

    return {
      entitlementPlan: "free",
      planExpiresAt: null,
    };
  }

  if (input.subscriptionStatus === "past_due") {
    if (!periodEnd) {
      return {
        entitlementPlan: "free",
        planExpiresAt: null,
      };
    }

    const graceEnd = addDays(periodEnd, config.BILLING_GRACE_DAYS);
    if (graceEnd >= now) {
      return {
        entitlementPlan: "pro",
        planExpiresAt: graceEnd.toISOString(),
      };
    }

    return {
      entitlementPlan: "free",
      planExpiresAt: null,
    };
  }

  return {
    entitlementPlan: "free",
    planExpiresAt: null,
  };
}

export function projectEntitlement(userId: string, entitlementPlan: "free" | "pro", planExpiresAt: string | null): void {
  const now = new Date().toISOString();

  db.insert(schema.userPlan)
    .values({
      userId,
      plan: entitlementPlan,
      planStartedAt: now,
      planExpiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.userPlan.userId,
      set: {
        plan: entitlementPlan,
        planExpiresAt,
        updatedAt: now,
      },
    })
    .run();
}

export function projectFreePlanIfMissing(userId: string): void {
  const now = new Date().toISOString();

  db.insert(schema.userPlan)
    .values({
      userId,
      plan: "free",
      planStartedAt: now,
      planExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();

  const row = db
    .select({ userId: schema.userPlan.userId })
    .from(schema.userPlan)
    .where(eq(schema.userPlan.userId, userId))
    .get();

  if (!row) {
    projectEntitlement(userId, "free", null);
  }
}
