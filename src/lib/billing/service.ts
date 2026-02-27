import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getBillingConfig } from "@/lib/billing/config";
import { projectEntitlement, projectFreePlanIfMissing, mapProviderPaymentStatus, mapProviderSubscriptionStatus, resolveEntitlement, subscriptionStatusFromEvent } from "@/lib/billing/entitlements";
import { getBillingProvider } from "@/lib/billing/providers";
import type { BillingPaymentSnapshot, BillingSubscriptionSnapshot } from "@/lib/billing/providers/types";
import type { BillingState } from "@/lib/billing/types";

type BillingSubscriptionRow = typeof schema.billingSubscriptions.$inferSelect;
type EntitlementResolution = ReturnType<typeof resolveEntitlement>;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function reaisToCents(value: unknown, fallback = 0): number {
  return Math.round(coerceNumber(value, fallback) * 100);
}

function extractProviderCustomerId(input: Record<string, unknown>): string | null {
  const direct = input.customer;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const payment = input.payment;
  if (payment && typeof payment === "object" && typeof (payment as { customer?: unknown }).customer === "string") {
    return (payment as { customer: string }).customer;
  }

  const subscription = input.subscription;
  if (subscription && typeof subscription === "object" && typeof (subscription as { customer?: unknown }).customer === "string") {
    return (subscription as { customer: string }).customer;
  }

  return null;
}

function extractProviderSubscriptionId(input: Record<string, unknown>): string | null {
  const direct = input.subscription;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const subscription = input.subscription;
  if (subscription && typeof subscription === "object" && typeof (subscription as { id?: unknown }).id === "string") {
    return (subscription as { id: string }).id;
  }

  const payment = input.payment;
  if (payment && typeof payment === "object" && typeof (payment as { subscription?: unknown }).subscription === "string") {
    return (payment as { subscription: string }).subscription;
  }

  return null;
}

function buildCheckoutUrl(providerCheckoutId: string): string {
  const config = getBillingConfig();
  return `${config.ASAAS_CHECKOUT_BASE_URL}/checkoutSession/show?id=${encodeURIComponent(providerCheckoutId)}`;
}

function getUserSnapshot(userId: string): { id: string; email: string; name: string | null } {
  const user = db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    throw new Error("User not found for billing");
  }

  return user;
}

function upsertBillingCustomer(input: {
  userId: string;
  providerCustomerId: string;
  email: string;
  name: string;
  cpfCnpj?: string | null;
  rawPayload: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();

  db.insert(schema.billingCustomers)
    .values({
      id: generateId("bc"),
      userId: input.userId,
      provider: "asaas",
      providerCustomerId: input.providerCustomerId,
      email: input.email,
      name: input.name,
      cpfCnpj: input.cpfCnpj || null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.billingCustomers.userId, schema.billingCustomers.provider],
      set: {
        providerCustomerId: input.providerCustomerId,
        email: input.email,
        name: input.name,
        cpfCnpj: input.cpfCnpj || null,
        updatedAt: now,
      },
    })
    .run();
}

function upsertBillingSubscription(input: {
  userId: string;
  providerSubscriptionId: string | null;
  providerCustomerId: string;
  providerCheckoutId: string | null;
  status: string;
  billingType?: string;
  nextDueDate?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  rawPayload: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();
  const config = getBillingConfig();

  const normalizedStatus = mapProviderSubscriptionStatus(input.status);

  const data = {
    userId: input.userId,
    provider: "asaas" as const,
    providerSubscriptionId: input.providerSubscriptionId,
    providerCustomerId: input.providerCustomerId,
    providerCheckoutId: input.providerCheckoutId,
    planKey: "pro_monthly",
    planPriceCents: config.PLAN_PRO_MONTHLY_BRL_CENTS,
    currency: "BRL",
    status: normalizedStatus,
    billingType: input.billingType || "CREDIT_CARD",
    nextDueDate: input.nextDueDate || null,
    currentPeriodEnd: input.currentPeriodEnd || input.nextDueDate || null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd || false,
    cancelledAt: input.cancelledAt || null,
    rawPayload: stringifyJson(input.rawPayload),
    updatedAt: now,
  };

  if (!input.providerSubscriptionId) {
    db.insert(schema.billingSubscriptions)
      .values({
        id: generateId("bs"),
        createdAt: now,
        ...data,
      })
      .run();
    return;
  }

  db.insert(schema.billingSubscriptions)
    .values({
      id: generateId("bs"),
      createdAt: now,
      ...data,
    })
    .onConflictDoUpdate({
      target: [schema.billingSubscriptions.provider, schema.billingSubscriptions.providerSubscriptionId],
      set: {
        providerCustomerId: data.providerCustomerId,
        providerCheckoutId: data.providerCheckoutId,
        status: data.status,
        billingType: data.billingType,
        nextDueDate: data.nextDueDate,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        cancelledAt: data.cancelledAt,
        rawPayload: data.rawPayload,
        updatedAt: data.updatedAt,
      },
    })
    .run();
}

function upsertBillingPayment(input: {
  userId: string;
  providerPaymentId: string;
  providerSubscriptionId: string | null;
  status: string;
  amountCents: number;
  dueDate?: string;
  paidAt?: string;
  invoiceUrl?: string;
  paymentLink?: string;
  rawPayload: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();

  db.insert(schema.billingPayments)
    .values({
      id: generateId("bp"),
      userId: input.userId,
      provider: "asaas",
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
      amountCents: input.amountCents,
      currency: "BRL",
      status: mapProviderPaymentStatus(input.status),
      dueDate: input.dueDate || null,
      paidAt: input.paidAt || null,
      invoiceUrl: input.invoiceUrl || null,
      paymentLink: input.paymentLink || null,
      rawPayload: stringifyJson(input.rawPayload),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.billingPayments.provider, schema.billingPayments.providerPaymentId],
      set: {
        providerSubscriptionId: input.providerSubscriptionId,
        amountCents: input.amountCents,
        status: mapProviderPaymentStatus(input.status),
        dueDate: input.dueDate || null,
        paidAt: input.paidAt || null,
        invoiceUrl: input.invoiceUrl || null,
        paymentLink: input.paymentLink || null,
        rawPayload: stringifyJson(input.rawPayload),
        updatedAt: now,
      },
    })
    .run();
}

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getEffectiveSubscriptionForEntitlement(
  userId: string
): { subscription: BillingSubscriptionRow; resolved: EntitlementResolution } | null {
  const subscriptions = db
    .select()
    .from(schema.billingSubscriptions)
    .where(eq(schema.billingSubscriptions.userId, userId))
    .all();

  if (subscriptions.length === 0) {
    return null;
  }

  const ranked = subscriptions
    .map((subscription) => {
      const resolved = resolveEntitlement({
        subscriptionStatus: subscription.status as "pending" | "active" | "past_due" | "canceled" | "expired",
        currentPeriodEnd: subscription.currentPeriodEnd,
      });

      const entitlementScore = resolved.entitlementPlan === "pro" ? 1 : 0;
      const expiresAtScore =
        resolved.entitlementPlan === "pro"
          ? (resolved.planExpiresAt ? toTimestamp(resolved.planExpiresAt) : Number.MAX_SAFE_INTEGER)
          : 0;
      const updatedAtScore = toTimestamp(subscription.updatedAt);

      return {
        subscription,
        resolved,
        entitlementScore,
        expiresAtScore,
        updatedAtScore,
      };
    })
    .sort((a, b) => {
      if (a.entitlementScore !== b.entitlementScore) {
        return b.entitlementScore - a.entitlementScore;
      }
      if (a.expiresAtScore !== b.expiresAtScore) {
        return b.expiresAtScore - a.expiresAtScore;
      }
      return b.updatedAtScore - a.updatedAtScore;
    });

  const winner = ranked[0];
  return {
    subscription: winner.subscription,
    resolved: winner.resolved,
  };
}

function applyEntitlementFromEffectiveSubscription(userId: string): void {
  const effective = getEffectiveSubscriptionForEntitlement(userId);

  if (!effective) {
    projectFreePlanIfMissing(userId);
    return;
  }

  projectEntitlement(userId, effective.resolved.entitlementPlan, effective.resolved.planExpiresAt);
}

function resolveBillingUserIdFromPayload(payload: Record<string, unknown>): string | null {
  const providerCustomerId = extractProviderCustomerId(payload);
  if (!providerCustomerId) {
    return null;
  }

  const customer = db
    .select({ userId: schema.billingCustomers.userId })
    .from(schema.billingCustomers)
    .where(eq(schema.billingCustomers.providerCustomerId, providerCustomerId))
    .get();

  return customer?.userId || null;
}

export async function createProCheckoutForUser(userId: string): Promise<{ checkoutUrl: string; providerCheckoutId: string }> {
  const user = getUserSnapshot(userId);
  const config = getBillingConfig();
  const provider = getBillingProvider("asaas");
  const effective = getEffectiveSubscriptionForEntitlement(userId);

  if (effective?.resolved.entitlementPlan === "pro") {
    throw new Error("User already has an active entitlement");
  }

  const latestPendingSubscription = db
    .select()
    .from(schema.billingSubscriptions)
    .where(
      and(
        eq(schema.billingSubscriptions.userId, userId),
        eq(schema.billingSubscriptions.status, "pending")
      )
    )
    .orderBy(desc(schema.billingSubscriptions.updatedAt))
    .limit(1)
    .get();

  if (
    latestPendingSubscription?.providerCheckoutId
  ) {
    return {
      checkoutUrl: buildCheckoutUrl(latestPendingSubscription.providerCheckoutId),
      providerCheckoutId: latestPendingSubscription.providerCheckoutId,
    };
  }

  const checkout = await provider.createSubscription({
    user: {
      userId,
      email: user.email,
      name: user.name || user.email,
    },
    planPriceCents: config.PLAN_PRO_MONTHLY_BRL_CENTS,
    successUrl: config.ASAAS_SUCCESS_URL,
    cancelUrl: config.ASAAS_CANCEL_URL,
  });

  upsertBillingCustomer({
    userId,
    providerCustomerId: checkout.providerCustomerId,
    email: user.email,
    name: user.name || user.email,
    rawPayload: checkout.rawPayload,
  });

  upsertBillingSubscription({
    userId,
    providerSubscriptionId: checkout.providerSubscriptionId,
    providerCustomerId: checkout.providerCustomerId,
    providerCheckoutId: checkout.providerCheckoutId,
    status: "PENDING",
    billingType: "CREDIT_CARD",
    rawPayload: checkout.rawPayload,
  });

  applyEntitlementFromEffectiveSubscription(userId);

  return {
    checkoutUrl: checkout.checkoutUrl,
    providerCheckoutId: checkout.providerCheckoutId,
  };
}

export function getBillingState(userId: string): BillingState {
  applyEntitlementFromEffectiveSubscription(userId);

  const effective = getEffectiveSubscriptionForEntitlement(userId);
  const effectiveSubscription = effective?.subscription || null;

  const latestPayment = db
    .select()
    .from(schema.billingPayments)
    .where(eq(schema.billingPayments.userId, userId))
    .orderBy(desc(schema.billingPayments.updatedAt))
    .limit(1)
    .get();

  const plan = db
    .select({ plan: schema.userPlan.plan })
    .from(schema.userPlan)
    .where(eq(schema.userPlan.userId, userId))
    .get();

  return {
    planKey: effectiveSubscription ? "pro_monthly" : "free",
    entitlementPlan: plan?.plan === "pro" ? "pro" : "free",
    subscriptionStatus: effectiveSubscription?.status as "pending" | "active" | "past_due" | "canceled" | "expired" | null,
    billingType: effectiveSubscription?.billingType || null,
    nextDueDate: effectiveSubscription?.nextDueDate || null,
    currentPeriodEnd: effectiveSubscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: effectiveSubscription?.cancelAtPeriodEnd || false,
    cancelledAt: effectiveSubscription?.cancelledAt || null,
    lastPaymentStatus: latestPayment?.status as "pending" | "paid" | "overdue" | "canceled" | "refunded" | null,
    lastPaymentDueDate: latestPayment?.dueDate || null,
    lastPaymentPaidAt: latestPayment?.paidAt || null,
  };
}

export async function cancelUserSubscription(userId: string): Promise<{ success: boolean }> {
  const provider = getBillingProvider("asaas");
  const effective = getEffectiveSubscriptionForEntitlement(userId);
  const subscriptionToCancel = effective?.subscription;

  if (!subscriptionToCancel?.providerSubscriptionId) {
    throw new Error("No provider subscription found");
  }

  await provider.cancelSubscription({
    providerSubscriptionId: subscriptionToCancel.providerSubscriptionId,
  });

  db.update(schema.billingSubscriptions)
    .set({
      status: "canceled",
      cancelAtPeriodEnd: true,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.billingSubscriptions.id, subscriptionToCancel.id))
    .run();

  applyEntitlementFromEffectiveSubscription(userId);

  return { success: true };
}

function markWebhookEventAs(eventId: string, status: "processed" | "failed" | "duplicate", errorMessage?: string): void {
  db.update(schema.billingWebhookEvents)
    .set({
      processingStatus: status,
      processedAt: new Date().toISOString(),
      errorMessage: errorMessage || null,
    })
    .where(eq(schema.billingWebhookEvents.id, eventId))
    .run();
}

function ensureSubscriptionFromWebhookPayment(input: {
  userId: string;
  payment: BillingPaymentSnapshot;
  providerCustomerId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): void {
  if (!input.payment.providerSubscriptionId) {
    return;
  }

  const statusFromEvent = subscriptionStatusFromEvent(input.eventType) || "pending";

  upsertBillingSubscription({
    userId: input.userId,
    providerSubscriptionId: input.payment.providerSubscriptionId,
    providerCustomerId: input.providerCustomerId,
    providerCheckoutId: null,
    status: statusFromEvent,
    billingType: "CREDIT_CARD",
    nextDueDate: input.payment.dueDate,
    currentPeriodEnd: input.payment.dueDate,
    rawPayload: input.payload,
  });
}

export async function handleAsaasWebhook(input: {
  rawBody: string;
  payloadFingerprint: string;
}): Promise<{ status: "processed" | "duplicate" | "failed" }> {
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    payload = { invalidJson: true };
  }

  const provider = getBillingProvider("asaas");
  const parsed = await provider.handleWebhook({ payload });

  const eventId = generateId("bwe");
  const createdAt = new Date().toISOString();

  const insertResult = db.insert(schema.billingWebhookEvents)
    .values({
      id: eventId,
      provider: "asaas",
      eventType: parsed.eventType,
      providerEventId: parsed.providerEventId,
      payloadFingerprint: input.payloadFingerprint,
      payload: stringifyJson(parsed.rawPayload),
      processingStatus: "received",
      createdAt,
    })
    .onConflictDoNothing()
    .run();

  if (insertResult.changes === 0) {
    return { status: "duplicate" };
  }

  try {
    const userId = resolveBillingUserIdFromPayload(payload);
    if (!userId) {
      markWebhookEventAs(eventId, "failed", "Unable to resolve billing user");
      return { status: "failed" };
    }

    const providerCustomerId = extractProviderCustomerId(payload);
    if (!providerCustomerId) {
      markWebhookEventAs(eventId, "failed", "Missing provider customer id");
      return { status: "failed" };
    }

    if (parsed.subscription) {
      upsertBillingSubscription({
        userId,
        providerSubscriptionId: parsed.subscription.providerSubscriptionId,
        providerCustomerId,
        providerCheckoutId:
          typeof parsed.subscription.checkoutSession === "string"
            ? parsed.subscription.checkoutSession
            : null,
        status: parsed.subscription.status || "PENDING",
        billingType: parsed.subscription.billingType,
        nextDueDate: parsed.subscription.nextDueDate,
        currentPeriodEnd: parsed.subscription.endDate || parsed.subscription.nextDueDate,
        rawPayload: parsed.rawPayload,
      });
    }

    if (parsed.payment) {
      upsertBillingPayment({
        userId,
        providerPaymentId: parsed.payment.providerPaymentId,
        providerSubscriptionId: parsed.payment.providerSubscriptionId || extractProviderSubscriptionId(payload),
        status: parsed.payment.status,
        amountCents: reaisToCents(parsed.payment.value),
        dueDate: parsed.payment.dueDate,
        paidAt: parsed.payment.paymentDate,
        invoiceUrl: parsed.payment.invoiceUrl,
        paymentLink: parsed.payment.bankSlipUrl,
        rawPayload: parsed.rawPayload,
      });

      ensureSubscriptionFromWebhookPayment({
        userId,
        payment: parsed.payment,
        providerCustomerId,
        eventType: parsed.eventType,
        payload: parsed.rawPayload,
      });
    }

    applyEntitlementFromEffectiveSubscription(userId);
    markWebhookEventAs(eventId, "processed");

    return { status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    markWebhookEventAs(eventId, "failed", message);
    return { status: "failed" };
  }
}

function upsertSubscriptionFromProvider(userId: string, providerCustomerId: string, subscription: BillingSubscriptionSnapshot): void {
  upsertBillingSubscription({
    userId,
    providerSubscriptionId: subscription.providerSubscriptionId,
    providerCustomerId,
    providerCheckoutId: typeof subscription.checkoutSession === "string" ? subscription.checkoutSession : null,
    status: subscription.status || "PENDING",
    billingType: subscription.billingType,
    nextDueDate: subscription.nextDueDate,
    currentPeriodEnd: subscription.endDate || subscription.nextDueDate,
    rawPayload: subscription,
  });
}

function upsertPaymentsFromProvider(userId: string, payments: BillingPaymentSnapshot[]): number {
  let processed = 0;

  for (const payment of payments) {
    upsertBillingPayment({
      userId,
      providerPaymentId: payment.providerPaymentId,
      providerSubscriptionId: payment.providerSubscriptionId || null,
      status: payment.status,
      amountCents: reaisToCents(payment.value),
      dueDate: payment.dueDate,
      paidAt: payment.paymentDate,
      invoiceUrl: payment.invoiceUrl,
      paymentLink: payment.bankSlipUrl,
      rawPayload: payment,
    });
    processed += 1;
  }

  return processed;
}

export async function reconcileSubscriptionByProviderId(userId: string, providerSubscriptionId: string): Promise<{ processedPayments: number }> {
  const provider = getBillingProvider("asaas");

  const subscription = await provider.syncSubscriptionStatus({ providerSubscriptionId });
  if (!subscription) {
    throw new Error("Subscription not found in provider");
  }

  const providerCustomerId =
    typeof subscription.providerCustomerId === "string" && subscription.providerCustomerId.length > 0
      ? subscription.providerCustomerId
      : db
          .select({ providerCustomerId: schema.billingSubscriptions.providerCustomerId })
          .from(schema.billingSubscriptions)
          .where(eq(schema.billingSubscriptions.providerSubscriptionId, providerSubscriptionId))
          .get()
          ?.providerCustomerId;

  if (!providerCustomerId) {
    throw new Error("Missing provider customer id for reconciliation");
  }

  upsertSubscriptionFromProvider(userId, providerCustomerId, subscription);

  const payments = await provider.listSubscriptionPayments({ providerSubscriptionId });
  const processedPayments = upsertPaymentsFromProvider(userId, payments);

  applyEntitlementFromEffectiveSubscription(userId);

  return { processedPayments };
}

export function listUsersForReconciliation(maxUsers: number): string[] {
  const rows = db
    .select({ userId: schema.billingSubscriptions.userId })
    .from(schema.billingSubscriptions)
    .where(inArray(schema.billingSubscriptions.status, ["pending", "active", "past_due", "canceled"]))
    .orderBy(desc(schema.billingSubscriptions.updatedAt))
    .limit(maxUsers)
    .all();

  return Array.from(new Set(rows.map((row) => row.userId)));
}

export function getLatestProviderSubscriptionId(userId: string): string | null {
  const effective = getEffectiveSubscriptionForEntitlement(userId);
  if (effective?.subscription.providerSubscriptionId) {
    return effective.subscription.providerSubscriptionId;
  }

  const fallback = db
    .select({ providerSubscriptionId: schema.billingSubscriptions.providerSubscriptionId })
    .from(schema.billingSubscriptions)
    .where(
      and(
        eq(schema.billingSubscriptions.userId, userId),
        inArray(schema.billingSubscriptions.status, ["active", "past_due", "canceled"])
      )
    )
    .orderBy(desc(schema.billingSubscriptions.updatedAt))
    .limit(1)
    .get();

  return fallback?.providerSubscriptionId || null;
}
