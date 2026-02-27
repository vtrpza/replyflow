"use client";

import { Spinner } from "./spinner";

interface LoadingOverlayProps {
  message?: string;
  show: boolean;
}

export function LoadingOverlay({ message = "Loading...", show }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <Spinner size="lg" className="text-emerald-500" />
        <p className="text-sm text-zinc-300 font-medium">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
}

export function InlineLoading({ message = "Loading..." }: InlineLoadingProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <Spinner className="text-emerald-500" />
      <span className="text-sm text-zinc-400">{message}</span>
    </div>
  );
}
