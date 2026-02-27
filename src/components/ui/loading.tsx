"use client";

import { Spinner } from "./spinner";
import { useI18n } from "@/lib/i18n";

interface LoadingOverlayProps {
  message?: string;
  show: boolean;
}

export function LoadingOverlay({ message, show }: LoadingOverlayProps) {
  const { locale } = useI18n();
  const resolvedMessage = message ?? (locale === "pt-BR" ? "Carregando..." : "Loading...");

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <Spinner size="lg" className="text-emerald-500" />
        <p className="text-sm text-zinc-300 font-medium">{resolvedMessage}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
}

export function InlineLoading({ message }: InlineLoadingProps) {
  const { locale } = useI18n();
  const resolvedMessage = message ?? (locale === "pt-BR" ? "Carregando..." : "Loading...");

  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <Spinner className="text-emerald-500" />
      <span className="text-sm text-zinc-400">{resolvedMessage}</span>
    </div>
  );
}
