import type { BillingProvider } from "@/lib/billing/providers/types";
import { asaasBillingProvider } from "@/lib/billing/providers/asaas/provider";

const providers: Record<"asaas", BillingProvider> = {
  asaas: asaasBillingProvider,
};

export function getBillingProvider(name: "asaas"): BillingProvider {
  return providers[name];
}
