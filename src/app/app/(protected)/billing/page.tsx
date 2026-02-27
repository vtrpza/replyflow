"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";

type BillingState = {
  planKey: "free" | "pro_monthly";
  entitlementPlan: "free" | "pro";
  subscriptionStatus: "pending" | "active" | "past_due" | "canceled" | "expired" | null;
  billingType: string | null;
  nextDueDate: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  lastPaymentStatus: "pending" | "paid" | "overdue" | "canceled" | "refunded" | null;
  lastPaymentDueDate: string | null;
  lastPaymentPaidAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export default function BillingPage() {
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabel = useMemo(() => (state?.entitlementPlan === "pro" ? "Pro" : "Free"), [state]);

  async function loadState(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/state", { cache: "no-store" });
      const payload = (await response.json()) as BillingState | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error?: string }).error || "Falha ao carregar billing");
      }
      setState(payload as BillingState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar billing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  async function startCheckout(): Promise<void> {
    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Falha ao iniciar checkout");
      }

      posthog.capture("billing_checkout_started", { current_plan: state?.entitlementPlan ?? "free" });
      window.location.href = payload.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Falha ao iniciar checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function cancelSubscription(): Promise<void> {
    setCancelLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/subscription/cancel", { method: "POST" });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Falha ao cancelar assinatura");
      }

      posthog.capture("billing_subscription_cancelled");
      await loadState();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Falha ao cancelar assinatura");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gerencie seu plano ReplyFlow Pro (R$ 39/mês)
        </p>
      </div>

      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        {loading ? (
          <p className="text-sm text-zinc-400">Carregando status...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-zinc-400">Plano atual</p>
              <span className="px-3 py-1 rounded bg-zinc-800 text-zinc-100 font-medium uppercase">{planLabel}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded bg-zinc-800 border border-zinc-700">
                <p className="text-zinc-400">Status da assinatura</p>
                <p className="text-zinc-100 font-medium uppercase">{state?.subscriptionStatus || "-"}</p>
              </div>
              <div className="p-3 rounded bg-zinc-800 border border-zinc-700">
                <p className="text-zinc-400">Próximo vencimento</p>
                <p className="text-zinc-100 font-medium">{formatDate(state?.nextDueDate || null)}</p>
              </div>
              <div className="p-3 rounded bg-zinc-800 border border-zinc-700">
                <p className="text-zinc-400">Último pagamento</p>
                <p className="text-zinc-100 font-medium uppercase">{state?.lastPaymentStatus || "-"}</p>
              </div>
              <div className="p-3 rounded bg-zinc-800 border border-zinc-700">
                <p className="text-zinc-400">Pago em</p>
                <p className="text-zinc-100 font-medium">{formatDate(state?.lastPaymentPaidAt || null)}</p>
              </div>
            </div>

            {state?.cancelAtPeriodEnd ? (
              <p className="text-xs text-amber-300">
                Assinatura marcada para cancelamento no fim do período atual.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => void startCheckout()}
                disabled={checkoutLoading}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded"
              >
                {checkoutLoading ? "Abrindo checkout..." : "Fazer upgrade para Pro"}
              </button>

              <button
                onClick={() => void cancelSubscription()}
                disabled={cancelLoading || state?.entitlementPlan !== "pro"}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-60 text-zinc-100 rounded"
              >
                {cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}
      </section>

      <div className="text-sm text-zinc-500">
        <Link href="/app/settings" className="underline hover:text-zinc-300">
          Voltar para configurações
        </Link>
      </div>
    </div>
  );
}
