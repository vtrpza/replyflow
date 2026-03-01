"use client";

import { LoadingButton } from "@/components/ui";

function formatTimestamp(
  value: string | null,
  locale: string,
  neverLabel: string,
  invalidLabel: string
): string {
  if (!value) return neverLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return invalidLabel;
  return date.toLocaleString(locale);
}

interface SignalsBarProps {
  matchScoreLastCalculated: string | null;
  calculating: boolean;
  onRecalculate: () => void;
  isPt: boolean;
}

export function SignalsBar({
  matchScoreLastCalculated,
  calculating,
  onRecalculate,
  isPt,
}: SignalsBarProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border px-4 py-3"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <span className="text-xs font-mono text-[var(--rf-muted)]">
        {isPt ? "Sinais calculados" : "Match signals last calculated"}:{" "}
        <span className="text-zinc-300">
          {formatTimestamp(
            matchScoreLastCalculated,
            isPt ? "pt-BR" : "en-US",
            isPt ? "nunca" : "never",
            isPt ? "inválido" : "invalid"
          )}
        </span>
      </span>
      <LoadingButton
        onClick={onRecalculate}
        loading={calculating}
        className="rounded-lg text-xs text-[var(--rf-bg)] hover:opacity-90 px-4 py-1.5"
        style={{ background: "var(--rf-gradient)" }}
      >
        {isPt ? "Recalcular sinais" : "Recalculate signals"}
      </LoadingButton>
    </div>
  );
}
