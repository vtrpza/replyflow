import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Checkout cancelado</h1>
        <p className="text-sm text-zinc-400">
          Nenhuma cobrança foi concluída. Você pode tentar novamente quando quiser.
        </p>
        <div className="flex gap-3">
          <Link href="/app/billing" className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
            Tentar novamente
          </Link>
          <Link href="/app/settings" className="px-4 py-2 rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-sm font-medium">
            Voltar para configurações
          </Link>
        </div>
      </div>
    </div>
  );
}
