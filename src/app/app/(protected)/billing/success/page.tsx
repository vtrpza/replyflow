import Link from "next/link";
import { redirect } from "next/navigation";

import { BILLING_ENABLED } from "@/lib/config";

export default function BillingSuccessPage() {
  if (!BILLING_ENABLED) {
    redirect("/app");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Pagamento confirmado</h1>
        <p className="text-sm text-zinc-400">
          Obrigado. Seu pagamento foi recebido e seu acesso Pro será liberado automaticamente em instantes.
        </p>
        <div className="flex gap-3">
          <Link href="/app/billing" className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
            Ver billing
          </Link>
          <Link href="/app" className="px-4 py-2 rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-sm font-medium">
            Ir para dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
