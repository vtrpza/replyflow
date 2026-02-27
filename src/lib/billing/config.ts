import { z } from "zod";

const BASE_URL_BY_ENV = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

const CHECKOUT_BASE_URL_BY_ENV = {
  sandbox: "https://sandbox.asaas.com",
  production: "https://www.asaas.com",
} as const;

const BillingConfigSchema = z.object({
  BILLING_PROVIDER: z.literal("asaas").default("asaas"),
  ASAAS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  ASAAS_API_KEY: z.string().min(1),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_CHECKOUT_BASE_URL: z.string().url().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().min(1),
  ASAAS_SUCCESS_URL: z.string().url(),
  ASAAS_CANCEL_URL: z.string().url(),
  PLAN_PRO_MONTHLY_BRL_CENTS: z.coerce.number().int().positive().default(3900),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(0).max(14).default(3),
  BILLING_RECONCILE_TOKEN: z.string().min(16),
});

export type BillingConfig = z.infer<typeof BillingConfigSchema>;
export type ResolvedBillingConfig = BillingConfig & {
  ASAAS_BASE_URL: string;
  ASAAS_CHECKOUT_BASE_URL: string;
};

let cachedConfig: ResolvedBillingConfig | null = null;

export function getBillingConfig(): ResolvedBillingConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = BillingConfigSchema.parse(process.env);
  cachedConfig = {
    ...parsed,
    ASAAS_BASE_URL: parsed.ASAAS_BASE_URL ?? BASE_URL_BY_ENV[parsed.ASAAS_ENV],
    ASAAS_CHECKOUT_BASE_URL:
      parsed.ASAAS_CHECKOUT_BASE_URL ?? CHECKOUT_BASE_URL_BY_ENV[parsed.ASAAS_ENV],
  };

  return cachedConfig;
}
