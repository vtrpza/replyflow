"use client";

import Link from "next/link";

function toPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

interface FunnelStageProps {
  label: string;
  value: number;
  href: string;
}

function FunnelStage({ label, value, href }: FunnelStageProps) {
  return (
    <Link
      href={href}
      className="rounded-lg border px-3 py-3 transition-colors hover:border-[var(--rf-cyan)]/40 hover:bg-white/[0.02]"
      style={{ borderColor: "var(--rf-border)", background: "rgba(11, 15, 20, 0.7)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--rf-muted)] font-mono">
        {label}
      </p>
      <p className="rf-number text-xl text-white mt-1">{value.toLocaleString()}</p>
    </Link>
  );
}

interface OutreachFunnelProps {
  outreachDrafted: number;
  outreachSentOnly: number;
  outreachFollowedUp: number;
  outreachReplied: number;
  outreachInterviewing: number;
  outreachAccepted: number;
  totalOutreachSent: number;
  totalReplies: number;
  totalInterviews: number;
  isPt: boolean;
}

export function OutreachFunnel({
  outreachDrafted,
  outreachSentOnly,
  outreachFollowedUp,
  outreachReplied,
  outreachInterviewing,
  outreachAccepted,
  totalOutreachSent,
  totalReplies,
  isPt,
}: OutreachFunnelProps) {
  const interviewStageCount = outreachInterviewing + outreachAccepted;
  const replyRate = toPercent(totalReplies, totalOutreachSent);
  const interviewRate = toPercent(interviewStageCount, totalReplies);

  const hasOutreach = totalOutreachSent > 0 || outreachDrafted > 0;

  return (
    <section
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-sm uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono">
          {isPt ? "Funil de execução" : "Execution funnel"}
        </h2>
        <span className="text-xs font-mono text-[var(--rf-muted)]">
          {isPt ? "Entrevistas" : "Interviews"}:{" "}
          <span className="text-white">{interviewStageCount}</span>
        </span>
      </div>

      {hasOutreach ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <FunnelStage
              label={isPt ? "Rascunho" : "Draft"}
              value={outreachDrafted}
              href="/app/compose"
            />
            <FunnelStage
              label={isPt ? "Enviado" : "Sent"}
              value={outreachSentOnly}
              href="/app/outreach"
            />
            <FunnelStage
              label="Follow-up"
              value={outreachFollowedUp}
              href="/app/outreach"
            />
            <FunnelStage
              label={isPt ? "Respondeu" : "Replied"}
              value={outreachReplied}
              href="/app/history"
            />
            <FunnelStage
              label={isPt ? "Entrevista" : "Interview"}
              value={interviewStageCount}
              href="/app/history"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-[var(--rf-muted)]">
            <p
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--rf-border)" }}
            >
              {isPt ? "Taxa de resposta" : "Reply rate"}:{" "}
              <span className="text-cyan-300">{replyRate}%</span>
            </p>
            <p
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--rf-border)" }}
            >
              {isPt ? "Taxa de entrevista" : "Interview rate"}:{" "}
              <span className="text-emerald-300">{interviewRate}%</span>
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: "var(--rf-border)" }}>
          <p className="text-sm text-[var(--rf-muted)]">
            {isPt
              ? "Seu funil de outreach aparecerá aqui"
              : "Your outreach pipeline will appear here"}
          </p>
          <Link
            href="/app/compose"
            className="mt-3 text-xs font-medium text-[var(--rf-cyan)] hover:underline"
          >
            {isPt ? "Compor mensagem →" : "Compose message →"}
          </Link>
        </div>
      )}
    </section>
  );
}
