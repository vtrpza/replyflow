"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-3">
          <h2 className="text-lg font-semibold">Algo deu errado</h2>
          <p className="text-sm text-zinc-400">
            O erro foi registrado. Tente novamente.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
