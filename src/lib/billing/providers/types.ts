import type { BillingUserSnapshot, CheckoutSessionResult } from "@/lib/billing/types";

export interface BillingSubscriptionSnapshot {
  providerSubscriptionId: string;
  providerCustomerId?: string;
  status?: string;
  billingType?: string;
  nextDueDate?: string;
  dateCreated?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface BillingPaymentSnapshot {
  providerPaymentId: string;
  providerSubscriptionId?: string | null;
  status: string;
  value: number;
  netValue?: number;
  dueDate?: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  [key: string]: unknown;
}

export interface CreateSubscriptionInput {
  user: BillingUserSnapshot;
  planPriceCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CancelSubscriptionInput {
  providerSubscriptionId: string;
}

export interface SyncSubscriptionStatusInput {
  providerSubscriptionId: string;
}

export interface ListSubscriptionPaymentsInput {
  providerSubscriptionId: string;
}

export interface HandleWebhookInput {
  payload: Record<string, unknown>;
}

export interface BillingProvider {
  readonly name: "asaas";

  createOrGetCustomer(user: BillingUserSnapshot): Promise<{
    providerCustomerId: string;
    rawPayload: Record<string, unknown>;
  }>;

  createSubscription(input: CreateSubscriptionInput): Promise<CheckoutSessionResult>;

  getSubscription(providerSubscriptionId: string): Promise<BillingSubscriptionSnapshot | null>;

  cancelSubscription(input: CancelSubscriptionInput): Promise<{ success: boolean; rawPayload: Record<string, unknown> }>;

  syncSubscriptionStatus(input: SyncSubscriptionStatusInput): Promise<BillingSubscriptionSnapshot | null>;

  listSubscriptionPayments(input: ListSubscriptionPaymentsInput): Promise<BillingPaymentSnapshot[]>;

  handleWebhook(input: HandleWebhookInput): Promise<{
    eventType: string;
    providerEventId: string | null;
    payment: BillingPaymentSnapshot | null;
    subscription: BillingSubscriptionSnapshot | null;
    rawPayload: Record<string, unknown>;
  }>;
}
