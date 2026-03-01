"use client";

import Link from "next/link";
import { AlertCircle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { computeNudges, type Nudge } from "./nudges";

const iconMap = {
  alert: <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />,
  info: <Info size={14} className="text-cyan-400 flex-shrink-0" />,
  success: <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />,
};

interface SmartNudgesProps {
  stats: {
    totalReposMonitored: number;
    newJobsThisWeek: number;
    outreachDrafted: number;
    matchScoreLastCalculated: string | null;
    outreachSentOnly: number;
    outreachReplied: number;
    totalInterviews: number;
    outreachInterviewing: number;
    outreachAccepted: number;
  };
  isPt: boolean;
  onRecalculate?: () => void;
}

export function SmartNudges({ stats, isPt, onRecalculate }: SmartNudgesProps) {
  const nudges = computeNudges(stats);

  if (nudges.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-mono text-[var(--rf-muted)]" style={{ borderColor: "var(--rf-border)" }}>
        <CheckCircle2 size={14} className="text-emerald-400" />
        {isPt ? "Tudo em dia. Adicione fontes ou revise vagas." : "All caught up. Add sources or review jobs."}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1">
      {nudges.map((nudge) => {
        const isRecalculate = nudge.href === "#recalculate";
        const text = isPt ? nudge.textPt : nudge.textEn;

        if (isRecalculate && onRecalculate) {
          return (
            <button
              key={nudge.key}
              type="button"
              onClick={onRecalculate}
              className="snap-start flex items-center gap-2.5 min-w-[220px] rounded-lg border px-4 py-3 text-xs font-medium text-zinc-200 transition-colors hover:border-[var(--rf-cyan)]/40 hover:bg-white/[0.02] flex-shrink-0"
              style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
            >
              {iconMap[nudge.icon]}
              <span className="truncate">{text}</span>
              <ChevronRight size={12} className="text-[var(--rf-muted)] ml-auto flex-shrink-0" />
            </button>
          );
        }

        return (
          <Link
            key={nudge.key}
            href={nudge.href}
            className="snap-start flex items-center gap-2.5 min-w-[220px] rounded-lg border px-4 py-3 text-xs font-medium text-zinc-200 transition-colors hover:border-[var(--rf-cyan)]/40 hover:bg-white/[0.02] flex-shrink-0"
            style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
          >
            {iconMap[nudge.icon]}
            <span className="truncate">{text}</span>
            <ChevronRight size={12} className="text-[var(--rf-muted)] ml-auto flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
