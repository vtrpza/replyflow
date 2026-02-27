export type BillingProviderName = "asaas";

export type BillingPlanKey = "free" | "pro_monthly";

export type BillingSubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type BillingPaymentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "canceled"
  | "refunded";

export type BillingWebhookProcessingStatus =
  | "received"
  | "processed"
  | "failed"
  | "duplicate";

export interface CheckoutSessionResult {
  provider: BillingProviderName;
  providerCheckoutId: string;
  checkoutUrl: string;
  providerSubscriptionId: string | null;
  providerCustomerId: string;
  rawPayload: Record<string, unknown>;
}

export interface BillingState {
  planKey: BillingPlanKey;
  entitlementPlan: "free" | "pro";
  subscriptionStatus: BillingSubscriptionStatus | null;
  billingType: string | null;
  nextDueDate: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  lastPaymentStatus: BillingPaymentStatus | null;
  lastPaymentDueDate: string | null;
  lastPaymentPaidAt: string | null;
}

export interface BillingUserSnapshot {
  userId: string;
  email: string;
  name: string;
  cpfCnpj?: string | null;
}

export interface ReconcileResult {
  userId: string;
  success: boolean;
  subscriptionId: string | null;
  processedPayments: number;
  error?: string;
}
