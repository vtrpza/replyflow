import { getBillingConfig } from "@/lib/billing/config";
import type {
  BillingPaymentSnapshot,
  BillingProvider,
  BillingSubscriptionSnapshot,
  HandleWebhookInput,
  ListSubscriptionPaymentsInput,
} from "@/lib/billing/providers/types";
import type { BillingUserSnapshot, CheckoutSessionResult } from "@/lib/billing/types";
import {
  AsaasClient,
  type AsaasCheckoutResponse,
  type AsaasPaymentResponse,
  type AsaasSubscriptionResponse,
} from "@/lib/billing/providers/asaas/client";

function buildCheckoutUrl(checkout: AsaasCheckoutResponse): string {
  if (typeof checkout.url === "string" && checkout.url.length > 0) {
    return checkout.url;
  }

  const config = getBillingConfig();
  return `${config.ASAAS_CHECKOUT_BASE_URL}/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`;
}

function mapSubscription(subscription: AsaasSubscriptionResponse): BillingSubscriptionSnapshot {
  return {
    providerSubscriptionId: subscription.id,
    providerCustomerId: subscription.customer,
    status: subscription.status,
    billingType: subscription.billingType,
    nextDueDate: subscription.nextDueDate,
    dateCreated: subscription.dateCreated,
    endDate: subscription.endDate,
    checkoutSession: subscription.checkoutSession,
    ...subscription,
  };
}

function mapPayment(payment: AsaasPaymentResponse): BillingPaymentSnapshot {
  return {
    providerPaymentId: payment.id,
    providerSubscriptionId: payment.subscription,
    status: payment.status || "PENDING",
    value: typeof payment.value === "number" ? payment.value : 0,
    dueDate: payment.dueDate,
    paymentDate: payment.paymentDate,
    invoiceUrl: payment.invoiceUrl,
    bankSlipUrl: payment.bankSlipUrl,
    ...payment,
  };
}

function extractProviderEventId(payload: Record<string, unknown>): string | null {
  if (typeof payload.id === "string" && payload.id.length > 0) {
    return payload.id;
  }

  const event = payload.event;
  if (typeof event === "string") {
    const payment = payload.payment as Record<string, unknown> | undefined;
    if (payment && typeof payment.id === "string" && payment.id.length > 0) {
      return `${event}:${payment.id}`;
    }
  }

  return null;
}

export class AsaasBillingProvider implements BillingProvider {
  readonly name = "asaas" as const;

  private client: AsaasClient | null = null;

  private getClient(): AsaasClient {
    if (!this.client) {
      this.client = new AsaasClient();
    }

    return this.client;
  }

  async createOrGetCustomer(user: BillingUserSnapshot): Promise<{
    providerCustomerId: string;
    rawPayload: Record<string, unknown>;
  }> {
    const client = this.getClient();
    const existing = await client.listCustomersByExternalReference(user.userId);
    const matched = existing.find((customer) => customer.email?.toLowerCase() === user.email.toLowerCase()) || existing[0];

    if (matched) {
      return {
        providerCustomerId: matched.id,
        rawPayload: matched,
      };
    }

    const created = await client.createCustomer({
      name: user.name,
      email: user.email,
      externalReference: user.userId,
      cpfCnpj: user.cpfCnpj,
    });

    return {
      providerCustomerId: created.id,
      rawPayload: created,
    };
  }

  async createSubscription(input: {
    user: BillingUserSnapshot;
    planPriceCents: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult> {
    const customer = await this.createOrGetCustomer(input.user);

    const checkout = await this.client.createCheckout({
      customer: customer.providerCustomerId,
      name: "ReplyFlow Pro",
      description: "ReplyFlow Pro mensal (R$ 39)",
      value: input.planPriceCents / 100,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      externalReference: input.user.userId,
    });

    const providerSubscriptionId =
      typeof checkout.subscription === "string"
        ? checkout.subscription
        : null;

    return {
      provider: "asaas",
      providerCheckoutId: checkout.id,
      checkoutUrl: buildCheckoutUrl(checkout),
      providerSubscriptionId,
      providerCustomerId: customer.providerCustomerId,
      rawPayload: checkout,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<BillingSubscriptionSnapshot | null> {
    const client = this.getClient();
    const data = await client.getSubscription(providerSubscriptionId);
    return mapSubscription(data);
  }

  async cancelSubscription(input: { providerSubscriptionId: string }): Promise<{ success: boolean; rawPayload: Record<string, unknown> }> {
    const client = this.getClient();
    const result = await client.cancelSubscription(input.providerSubscriptionId);
    return {
      success: true,
      rawPayload: result,
    };
  }

  async syncSubscriptionStatus(input: { providerSubscriptionId: string }): Promise<BillingSubscriptionSnapshot | null> {
    const client = this.getClient();
    const subscription = await client.getSubscription(input.providerSubscriptionId);
    return mapSubscription(subscription);
  }

  async listSubscriptionPayments(input: ListSubscriptionPaymentsInput): Promise<BillingPaymentSnapshot[]> {
    const client = this.getClient();
    const payments = await client.listSubscriptionPayments(input.providerSubscriptionId);
    return payments.map(mapPayment);
  }

  async handleWebhook(input: HandleWebhookInput): Promise<{
    eventType: string;
    providerEventId: string | null;
    payment: BillingPaymentSnapshot | null;
    subscription: BillingSubscriptionSnapshot | null;
    rawPayload: Record<string, unknown>;
  }> {
    const payload = input.payload;
    const eventType = typeof payload.event === "string" ? payload.event : "UNKNOWN";

    const paymentRaw = payload.payment;
    const payment =
      paymentRaw && typeof paymentRaw === "object"
        ? mapPayment(paymentRaw as AsaasPaymentResponse)
        : null;

    const subscriptionRaw = payload.subscription;
    let subscription: BillingSubscriptionSnapshot | null = null;

    if (subscriptionRaw && typeof subscriptionRaw === "object") {
      subscription = mapSubscription(subscriptionRaw as AsaasSubscriptionResponse);
    } else if (payment && typeof payment.providerSubscriptionId === "string" && payment.providerSubscriptionId.length > 0) {
      subscription = {
        providerSubscriptionId: payment.providerSubscriptionId,
      };
    }

    return {
      eventType,
      providerEventId: extractProviderEventId(payload),
      payment,
      subscription,
      rawPayload: payload,
    };
  }
}

export const asaasBillingProvider = new AsaasBillingProvider();
