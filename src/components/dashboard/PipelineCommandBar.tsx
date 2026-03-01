"use client";

import Link from "next/link";
import {
  FolderGit2,
  Briefcase,
  Send,
  MessageSquare,
  RefreshCw,
  Search,
  PenLine,
  Eye,
} from "lucide-react";
import type { ReactNode } from "react";

interface StageProps {
  icon: ReactNode;
  label: string;
  count: number;
  delta: string;
  ctaLabel: string;
  href: string;
  statusColor: string;
}

function Stage({ icon, label, count, delta, ctaLabel, href, statusColor }: StageProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-xl border px-4 py-4 transition-all duration-200 hover:border-[var(--rf-cyan)]/40 rf-glow-hover"
      style={{ borderColor: "var(--rf-border)", background: "rgba(11, 15, 20, 0.7)" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
          style={{ background: statusColor }}
        />
        <span className="text-[var(--rf-muted)]">{icon}</span>
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--rf-muted)] font-mono">
          {label}
        </span>
      </div>

      <p className="rf-number text-2xl font-bold text-white">{count.toLocaleString()}</p>
      <p className="text-[11px] text-[var(--rf-muted)] font-mono">{delta}</p>

      <span className="hidden sm:inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-[var(--rf-cyan)] opacity-0 group-hover:opacity-100 transition-opacity">
        {ctaLabel}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="translate-x-0 group-hover:translate-x-0.5 transition-transform">
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {/* Desktop arrow connector */}
      <span className="hidden lg:block absolute -right-[13px] top-1/2 -translate-y-1/2 text-[var(--rf-border)] z-10 pointer-events-none">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
          <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

interface PipelineCommandBarProps {
  totalReposMonitored: number;
  totalJobs: number;
  totalOutreachSent: number;
  totalReplies: number;
  newJobsToday: number;
  newJobsThisWeek: number;
  outreachDrafted: number;
  totalInterviews: number;
  isPt: boolean;
}

export function PipelineCommandBar({
  totalReposMonitored,
  totalJobs,
  totalOutreachSent,
  totalReplies,
  newJobsToday,
  newJobsThisWeek,
  outreachDrafted,
  totalInterviews,
  isPt,
}: PipelineCommandBarProps) {
  const stages: StageProps[] = [
    {
      icon: <FolderGit2 size={14} />,
      label: isPt ? "Fontes" : "Sources",
      count: totalReposMonitored,
      delta: isPt ? `+${newJobsToday} hoje` : `+${newJobsToday} today`,
      ctaLabel: totalReposMonitored === 0
        ? (isPt ? "Adicionar fonte" : "Add source")
        : (isPt ? "Sincronizar" : "Sync now"),
      href: "/app/sources",
      statusColor: totalReposMonitored > 0 ? "#22C55E" : "#71717A",
    },
    {
      icon: <Briefcase size={14} />,
      label: isPt ? "Vagas" : "Jobs",
      count: totalJobs,
      delta: isPt ? `+${newJobsThisWeek} na semana` : `+${newJobsThisWeek} this week`,
      ctaLabel: isPt ? "Revisar" : "Review",
      href: "/app/jobs",
      statusColor: newJobsThisWeek > 0 ? "#22C55E" : totalJobs > 0 ? "#38BDF8" : "#71717A",
    },
    {
      icon: <Send size={14} />,
      label: "Outreach",
      count: totalOutreachSent,
      delta: isPt
        ? `${outreachDrafted} rascunhos`
        : `${outreachDrafted} drafts`,
      ctaLabel: outreachDrafted > 0
        ? (isPt ? "Enviar" : "Send")
        : (isPt ? "Compor" : "Compose"),
      href: "/app/compose",
      statusColor: outreachDrafted > 0 ? "#F59E0B" : totalOutreachSent > 0 ? "#22C55E" : "#71717A",
    },
    {
      icon: <MessageSquare size={14} />,
      label: isPt ? "Resultados" : "Results",
      count: totalReplies,
      delta: isPt
        ? `${totalInterviews} entrevistas`
        : `${totalInterviews} interviews`,
      ctaLabel: isPt ? "Ver" : "View",
      href: "/app/history",
      statusColor: totalReplies > 0 ? "#22C55E" : "#71717A",
    },
  ];

  return (
    <section
      className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6 rf-glow"
      style={{
        borderColor: "var(--rf-border)",
        background:
          "linear-gradient(135deg, rgba(15, 22, 33, 0.98) 0%, rgba(11, 15, 20, 0.98) 50%, rgba(15, 22, 33, 0.95) 100%)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rf-cyan)] font-mono opacity-90 mb-4">
        {isPt ? "Seu pipeline de busca" : "Your job-search pipeline"}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {stages.map((stage, i) => (
          <Stage key={stage.href} {...stage} />
        ))}
      </div>
    </section>
  );
}
