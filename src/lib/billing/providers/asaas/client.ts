import { getBillingConfig } from "@/lib/billing/config";

export interface AsaasApiErrorItem {
  code: string;
  description: string;
}

interface AsaasApiErrorBody {
  errors?: AsaasApiErrorItem[];
}

export class AsaasApiError extends Error {
  status: number;

  details: AsaasApiErrorItem[];

  constructor(status: number, details: AsaasApiErrorItem[], message = "Asaas API request failed") {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface AsaasCustomerResponse {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
  externalReference?: string;
  [key: string]: unknown;
}

export interface AsaasCheckoutResponse {
  id: string;
  url?: string;
  value?: number;
  billingTypes?: string[];
  chargeTypes?: string[];
  subscriptionCycle?: string;
  [key: string]: unknown;
}

export interface AsaasSubscriptionResponse {
  id: string;
  customer?: string;
  status?: string;
  billingType?: string;
  value?: number;
  dateCreated?: string;
  nextDueDate?: string;
  endDate?: string;
  checkoutSession?: string;
  [key: string]: unknown;
}

export interface AsaasPaymentResponse {
  id: string;
  customer?: string;
  subscription?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  [key: string]: unknown;
}

interface AsaasListResponse<T> {
  data: T[];
}

interface AsaasRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
}

export class AsaasClient {
  private readonly apiKey: string;

  private readonly baseUrl: string;

  constructor() {
    const config = getBillingConfig();
    this.apiKey = config.ASAAS_API_KEY;
    this.baseUrl = config.ASAAS_BASE_URL;
  }

  async createCustomer(input: {
    name: string;
    email: string;
    externalReference: string;
    cpfCnpj?: string | null;
  }): Promise<AsaasCustomerResponse> {
    return this.request<AsaasCustomerResponse>({
      method: "POST",
      path: "/customers",
      body: {
        name: input.name,
        email: input.email,
        externalReference: input.externalReference,
        ...(input.cpfCnpj ? { cpfCnpj: input.cpfCnpj } : {}),
      },
    });
  }

  async listCustomersByExternalReference(externalReference: string): Promise<AsaasCustomerResponse[]> {
    const encoded = encodeURIComponent(externalReference);
    const response = await this.request<AsaasListResponse<AsaasCustomerResponse>>({
      method: "GET",
      path: `/customers?externalReference=${encoded}&limit=10`,
    });

    return response.data;
  }

  async createCheckout(input: {
    customer: string;
    name: string;
    description: string;
    value: number;
    successUrl: string;
    cancelUrl: string;
    externalReference: string;
  }): Promise<AsaasCheckoutResponse> {
    return this.request<AsaasCheckoutResponse>({
      method: "POST",
      path: "/checkouts",
      body: {
        customer: input.customer,
        name: input.name,
        description: input.description,
        value: input.value,
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        subscriptionCycle: "MONTHLY",
        maxInstallmentCount: 1,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        externalReference: input.externalReference,
      },
    });
  }

  async getSubscription(id: string): Promise<AsaasSubscriptionResponse> {
    return this.request<AsaasSubscriptionResponse>({
      method: "GET",
      path: `/subscriptions/${encodeURIComponent(id)}`,
    });
  }

  async cancelSubscription(id: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "DELETE",
      path: `/subscriptions/${encodeURIComponent(id)}`,
    });
  }

  async listSubscriptionPayments(subscriptionId: string): Promise<AsaasPaymentResponse[]> {
    const encoded = encodeURIComponent(subscriptionId);
    const response = await this.request<AsaasListResponse<AsaasPaymentResponse>>({
      method: "GET",
      path: `/payments?subscription=${encoded}&limit=100`,
    });

    return response.data;
  }

  private async request<T>(options: AsaasRequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${options.path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        access_token: this.apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as AsaasApiErrorBody;
      const details = Array.isArray(errorBody.errors) ? errorBody.errors : [];
      throw new AsaasApiError(response.status, details, `Asaas request failed (${response.status})`);
    }

    return (await response.json()) as T;
  }
}
