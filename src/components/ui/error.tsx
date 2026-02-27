"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({
  title,
  message,
  onRetry,
  className = "",
}: ErrorBannerProps) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const resolvedTitle = title || (isPt ? "Erro" : "Error");

  return (
    <div className={`flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-400">{resolvedTitle}</p>
        <p className="text-sm text-zinc-400 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isPt ? "Tentar novamente" : "Retry"}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorState({
  title,
  message,
  action,
}: ErrorStateProps) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const resolvedTitle = title || (isPt ? "Algo deu errado" : "Something went wrong");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">{resolvedTitle}</h3>
      <p className="text-sm text-zinc-400 max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: EmptyStateProps) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const resolvedTitle = title || (isPt ? "Sem dados ainda" : "No data yet");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">{resolvedTitle}</h3>
      <p className="text-sm text-zinc-400 max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
