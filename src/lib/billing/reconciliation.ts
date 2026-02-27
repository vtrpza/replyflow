import { getLatestProviderSubscriptionId, listUsersForReconciliation, reconcileSubscriptionByProviderId } from "@/lib/billing/service";
import type { ReconcileResult } from "@/lib/billing/types";

export async function reconcileBillingForUser(userId: string): Promise<ReconcileResult> {
  try {
    const providerSubscriptionId = getLatestProviderSubscriptionId(userId);
    if (!providerSubscriptionId) {
      return {
        userId,
        success: true,
        subscriptionId: null,
        processedPayments: 0,
      };
    }

    const result = await reconcileSubscriptionByProviderId(userId, providerSubscriptionId);

    return {
      userId,
      success: true,
      subscriptionId: providerSubscriptionId,
      processedPayments: result.processedPayments,
    };
  } catch (error) {
    return {
      userId,
      success: false,
      subscriptionId: null,
      processedPayments: 0,
      error: error instanceof Error ? error.message : "Reconciliation failed",
    };
  }
}

export async function reconcileStaleBilling(maxUsers = 50): Promise<ReconcileResult[]> {
  const users = listUsersForReconciliation(maxUsers);
  const results: ReconcileResult[] = [];

  for (const userId of users) {
    const result = await reconcileBillingForUser(userId);
    results.push(result);
  }

  return results;
}
