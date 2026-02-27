"use client";

import { Fragment, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  EmptyState,
  LoadingButton,
  LoadingOverlay,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Stats {
  totalJobs: number;
  newJobsToday: number;
  newJobsThisWeek: number;
  totalReposMonitored: number;
  totalOutreachSent: number;
  totalReplies: number;
  totalInterviews: number;
  remoteJobs: number;
  jobsWithEmail: number;
  jobsAtsOnly: number;
  jobsWithMatchScore: number;
  matchScoreLastCalculated: string | null;
  outreachDrafted: number;
  outreachSentOnly: number;
  outreachFollowedUp: number;
  outreachReplied: number;
  outreachInterviewing: number;
  outreachAccepted: number;
  jobsByContractType: { type: string; count: number }[];
  jobsByExperienceLevel: { level: string; count: number }[];
  jobsByRepo: { repo: string; count: number }[];
}

interface PipelineStage {
  id: string;
  label: string;
  glyph: string;
  value: number;
  toneClass: string;
}

function toPercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function formatTimestamp(
  value: string | null,
  locale: string,
  neverLabel: string,
  invalidLabel: string
): string {
  if (!value) {
    return neverLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return invalidLabel;
  }

  return date.toLocaleString(locale);
}

export default function Dashboard() {
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() =>
        toast.error(isPt ? "Falha ao buscar estatisticas do dashboard" : "Failed to fetch dashboard stats")
      )
      .finally(() => setLoading(false));
  }, [toast, isPt]);

  const handleCalculateScores = async (): Promise<void> => {
    setCalculating(true);
    try {
      const res = await fetch("/api/jobs/match", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        toast.success(
          isPt
            ? `Scores de match calculados para ${result.updatedCount} vagas`
            : `Calculated match scores for ${result.updatedCount} jobs`
        );
        const statsRes = await fetch("/api/stats");
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${result.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao calcular score de match" : "Failed to calculate match scores");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Skeleton className="xl:col-span-5 h-52 rounded-xl" />
          <Skeleton className="xl:col-span-4 h-52 rounded-xl" />
          <Skeleton className="xl:col-span-3 h-52 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Skeleton className="lg:col-span-8 h-60 rounded-xl" />
          <Skeleton className="lg:col-span-4 h-60 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <EmptyState
          title={isPt ? "Ainda nao ha dados no pipeline" : "No pipeline data yet"}
          message={
            isPt
              ? 'Rode "Sincronizar Vagas" na barra lateral para gerar seu primeiro lote de leads.'
              : 'Run "Scrape Jobs" in the sidebar to bootstrap your first batch of leads.'
          }
          icon={<span className="text-2xl font-mono text-[var(--rf-cyan)]">$</span>}
        />
      </div>
    );
  }

  const directRate = toPercent(stats.jobsWithEmail, stats.totalJobs);
  const hasLeads = stats.totalJobs > 0;
  const replyRate = toPercent(stats.totalReplies, stats.totalOutreachSent);
  const interviewRate = toPercent(stats.totalInterviews, stats.totalReplies);
  const interviewStageCount = stats.outreachInterviewing + stats.outreachAccepted;

  const pipelineStages: PipelineStage[] = [
    {
      id: "lead",
      label: isPt ? "Lead" : "Lead",
      glyph: ">",
      value: stats.totalJobs,
      toneClass: "text-cyan-300",
    },
    {
      id: "draft",
      label: isPt ? "Rascunho" : "Draft",
      glyph: "~",
      value: stats.outreachDrafted,
      toneClass: "text-sky-300",
    },
    {
      id: "send",
      label: isPt ? "Enviar" : "Send",
      glyph: "->",
      value: stats.outreachSentOnly,
      toneClass: "text-cyan-200",
    },
    {
      id: "followup",
      label: isPt ? "Follow-up" : "Follow up",
      glyph: ">>",
      value: stats.outreachFollowedUp,
      toneClass: "text-emerald-300",
    },
    {
      id: "reply",
      label: isPt ? "Resposta" : "Reply",
      glyph: "<",
      value: stats.outreachReplied,
      toneClass: "text-green-300",
    },
    {
      id: "interview",
      label: isPt ? "Entrevista" : "Interview",
      glyph: "#",
      value: interviewStageCount,
      toneClass: "text-emerald-200",
    },
  ];

  const maxRepoCount = Math.max(...stats.jobsByRepo.map((item) => item.count), 1);
  const maxContractCount = Math.max(
    ...stats.jobsByContractType.map((item) => item.count),
    1
  );
  const maxExperienceCount = Math.max(
    ...stats.jobsByExperienceLevel.map((item) => item.count),
    1
  );

  const donutStyle = {
    "--rf-donut-fill": hasLeads
      ? `conic-gradient(var(--rf-green) 0% ${directRate}%, rgba(148, 163, 184, 0.24) ${directRate}% 100%)`
      : "conic-gradient(rgba(148, 163, 184, 0.28) 0% 100%)",
  } as CSSProperties;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <LoadingOverlay
        show={calculating}
        message={
          isPt
            ? "Recalculando sinais de score de match..."
            : "Recalculating match score signals..."
        }
      />

      <section
        className="rf-animate-in rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: "var(--rf-border)",
          background:
            "linear-gradient(180deg, rgba(15, 22, 33, 0.95) 0%, rgba(11, 15, 20, 0.95) 100%)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--rf-muted)] font-mono mb-2">
              {isPt ? "centro de comando" : "command center"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {isPt ? "Pipeline de Outreach" : "Outreach Pipeline"}
            </h1>
            <p className="text-sm text-[var(--rf-muted)] mt-2">
              {isPt
                ? "Leads, envios, respostas e entrevistas em uma unica visao."
                : "Leads, sends, replies, and interviews in one operator view."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono text-[var(--rf-muted)]"
                style={{ borderColor: "var(--rf-border)" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rf-green)] animate-pulse" />
                {isPt ? "monitoramento ao vivo" : "live tracking"}
              </span>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono text-[var(--rf-muted)]"
                style={{ borderColor: "var(--rf-border)" }}>
                {isPt ? "ultimo calculo" : "last score calc"}: {formatTimestamp(
                  stats.matchScoreLastCalculated,
                  isPt ? "pt-BR" : "en-US",
                  isPt ? "nunca" : "never",
                  isPt ? "invalido" : "invalid"
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="text-xs font-mono text-[var(--rf-muted)]">
              <span className="rf-gradient-text">{stats.totalJobs.toLocaleString()}</span> {isPt ? "leads" : "leads"} / {stats.totalOutreachSent.toLocaleString()} {isPt ? "enviados" : "sent"} / {stats.totalReplies.toLocaleString()} {isPt ? "respostas" : "replies"}
            </div>
            {stats.totalJobs > 0 && (
              <LoadingButton
                onClick={handleCalculateScores}
                loading={calculating}
                className="rounded-lg text-[var(--rf-bg)] hover:opacity-90"
                style={{ background: "var(--rf-gradient)" }}
              >
                {isPt ? "Recalcular Score de Match" : "Recalculate Match Scores"}
              </LoadingButton>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <article
          className="rf-animate-in xl:col-span-5 rounded-xl border p-5"
          style={{
            animationDelay: "60ms",
            borderColor: "var(--rf-border)",
            background: "rgba(15, 22, 33, 0.9)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-2">
            {isPt ? "sinal de contato direto" : "direct contact signal"}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-[var(--rf-muted)]">{isPt ? "Taxa direta" : "Direct rate"}</p>
              <p className="rf-number text-5xl font-bold rf-gradient-text leading-none mt-1">
                {hasLeads ? `${directRate}%` : "--"}
              </p>
            </div>
            <div className="text-right text-xs text-[var(--rf-muted)] font-mono space-y-1">
              <p>{stats.jobsWithEmail.toLocaleString()} direct</p>
              <p>{stats.jobsWithEmail.toLocaleString()} {isPt ? "diretos" : "direct"}</p>
              <p>{stats.jobsAtsOnly.toLocaleString()} ats-only</p>
              <p>{stats.jobsWithMatchScore.toLocaleString()} {isPt ? "com score" : "scored"}</p>
            </div>
          </div>
          <div className="mt-5">
            <div
              className="h-2.5 rounded-full border overflow-hidden"
              style={{ borderColor: "rgba(31, 42, 55, 0.95)", background: "rgba(11, 15, 20, 0.9)" }}
            >
              <div
                className="h-full"
                style={{
                  width: `${directRate}%`,
                  background: "var(--rf-gradient)",
                }}
              />
            </div>
            <div className="mt-2 text-[11px] font-mono text-[var(--rf-muted)] flex items-center justify-between">
              <span>{hasLeads ? (isPt ? "contato primeiro" : "contact-first") : isPt ? "aguardando leads" : "waiting for leads"}</span>
              <span>{hasLeads ? `${100 - directRate}% ats pressure` : "n/a"}</span>
            </div>
          </div>
        </article>

        <article
          className="rf-animate-in xl:col-span-4 rounded-xl border p-5"
          style={{
            animationDelay: "100ms",
            borderColor: "var(--rf-border)",
            background: "rgba(15, 22, 33, 0.9)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
            {isPt ? "resumo do pipeline" : "pipeline snapshot"}
          </p>
          <div className="space-y-3">
            <MiniRow label={isPt ? "Rascunhado" : "Drafted"} value={stats.outreachDrafted} tone="text-sky-300" />
            <MiniRow label={isPt ? "Enviado" : "Sent"} value={stats.outreachSentOnly} tone="text-cyan-300" />
            <MiniRow label={isPt ? "Follow-up" : "Follow-up"} value={stats.outreachFollowedUp} tone="text-emerald-300" />
            <MiniRow label={isPt ? "Respondeu" : "Replied"} value={stats.outreachReplied} tone="text-green-300" />
            <MiniRow label={isPt ? "Entrevista" : "Interview"} value={interviewStageCount} tone="text-emerald-200" />
          </div>
        </article>

        <article
          className="rf-animate-in xl:col-span-3 rounded-xl border p-5"
          style={{
            animationDelay: "140ms",
            borderColor: "var(--rf-border)",
            background: "rgba(15, 22, 33, 0.9)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
            {isPt ? "estatisticas de mercado" : "market stats"}
          </p>
          <div className="space-y-4">
            <MetricLine label={isPt ? "Total de vagas" : "Total jobs"} value={stats.totalJobs} />
            <MetricLine label={isPt ? "Novas na semana" : "New this week"} value={stats.newJobsThisWeek} />
            <MetricLine label={isPt ? "Novas hoje" : "New today"} value={stats.newJobsToday} />
            <MetricLine label={isPt ? "Vagas remotas" : "Remote jobs"} value={stats.remoteJobs} />
            <MetricLine label={isPt ? "Repos monitorados" : "Repos monitored"} value={stats.totalReposMonitored} />
          </div>
        </article>
      </section>

      <section
        className="rf-animate-in rounded-2xl border p-5 sm:p-6"
        style={{
          animationDelay: "180ms",
          borderColor: "var(--rf-border)",
          background: "rgba(15, 22, 33, 0.92)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono">
              {isPt ? "mapa de fluxo" : "flow map"}
            </p>
            <h2 className="text-lg font-semibold text-white mt-1">
              {isPt
                ? `Lead -> Rascunho -> Enviar -> Follow-up -> Resposta -> Entrevista`
                : `Lead -> Draft -> Send -> Follow up -> Reply -> Interview`}
            </h2>
          </div>
          <p className="text-xs font-mono text-[var(--rf-muted)]">
            {isPt ? "aceitos" : "accepted"}: <span className="text-[var(--rf-green)] rf-number">{stats.outreachAccepted}</span>
          </p>
        </div>

        <div className="hidden xl:flex items-stretch gap-2.5">
          {pipelineStages.map((stage, index) => {
            const nextStage = pipelineStages[index + 1];
            const conversion = nextStage ? toPercent(nextStage.value, stage.value) : 0;

            return (
              <Fragment key={stage.id}>
                <PipelineStageCard stage={stage} />
                {nextStage && (
                  <div className="w-16 flex flex-col items-center justify-center gap-1.5">
                    <span className="rf-number text-[10px] text-[var(--rf-muted)]">
                      {conversion}%
                    </span>
                    <span className="w-full h-px bg-gradient-to-r from-cyan-400/70 to-emerald-400/70" />
                    <span className="text-[10px] font-mono text-zinc-500">-&gt;</span>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="xl:hidden grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pipelineStages.map((stage) => (
            <PipelineStageCard key={stage.id} stage={stage} compact />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <article
          className="rf-animate-in lg:col-span-8 rounded-xl border p-5"
          style={{
            animationDelay: "220ms",
            borderColor: "var(--rf-border)",
            background: "rgba(15, 22, 33, 0.9)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
            {isPt ? "performance de outreach" : "outreach performance"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricBlock label={isPt ? "Enviados" : "Sent"} value={stats.totalOutreachSent} helper={isPt ? "total enviado" : "total outbound"} tone="text-cyan-300" />
            <MetricBlock label={isPt ? "Respostas" : "Replies"} value={stats.totalReplies} helper={isPt ? `${replyRate}% dos envios` : `${replyRate}% from sent`} tone="text-emerald-300" />
            <MetricBlock label={isPt ? "Entrevistas" : "Interviews"} value={stats.totalInterviews} helper={isPt ? `${interviewRate}% das respostas` : `${interviewRate}% from replies`} tone="text-green-300" />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[var(--rf-muted)]">
            <p className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
              {isPt ? "taxa de resposta" : "reply rate"}: <span className="rf-number text-cyan-300">{replyRate}%</span>
            </p>
            <p className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
              {isPt ? "taxa de entrevista" : "interview rate"}: <span className="rf-number text-emerald-300">{interviewRate}%</span>
            </p>
            <p className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
              {isPt ? "aceitos" : "accepted"}: <span className="rf-number text-green-300">{stats.outreachAccepted}</span>
            </p>
          </div>
        </article>

        <article
          className="rf-animate-in lg:col-span-4 rounded-xl border p-5"
          style={{
            animationDelay: "260ms",
            borderColor: "var(--rf-border)",
            background: "rgba(15, 22, 33, 0.9)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
            {isPt ? "distribuicao de contato" : "contact distribution"}
          </p>

          <div className="w-44 h-44 mx-auto rf-donut" style={donutStyle} />

          <div className="mt-3 text-center">
            <p className="rf-number text-3xl font-bold text-white leading-none">
              {hasLeads ? `${directRate}%` : "--"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono mt-1">
              {hasLeads ? (isPt ? "sinal direto" : "direct signal") : isPt ? "sem leads ainda" : "no leads yet"}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
              <p className="text-[var(--rf-muted)] font-mono">{isPt ? "direto" : "direct"}</p>
              <p className="rf-number text-white mt-1">{stats.jobsWithEmail.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
              <p className="text-[var(--rf-muted)] font-mono">ats-only</p>
              <p className="rf-number text-white mt-1">{stats.jobsAtsOnly.toLocaleString()}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataCard title={isPt ? "Vagas por repositorio" : "Jobs by Repository"} delay="300ms">
          {stats.jobsByRepo.length > 0 ? (
            <div className="space-y-3">
              {stats.jobsByRepo.map((item) => {
                const width = Math.max((item.count / maxRepoCount) * 100, 6);
                return (
                  <div key={item.repo} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-300 truncate font-mono max-w-[180px]">{item.repo}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, background: "var(--rf-gradient)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--rf-muted)]">{isPt ? "Ainda sem dados por repositorio." : "No repository data yet."}</p>
          )}
        </DataCard>

        <DataCard title={isPt ? "Tipos de contrato" : "Contract Types"} delay="340ms">
          {stats.jobsByContractType.length > 0 ? (
            <div className="space-y-3">
              {stats.jobsByContractType.map((item) => {
                const width = Math.max((item.count / maxContractCount) * 100, 8);
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.type}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--rf-muted)]">{isPt ? "Ainda sem dados de contrato." : "No contract data yet."}</p>
          )}
        </DataCard>

        <DataCard title={isPt ? "Niveis de experiencia" : "Experience Levels"} delay="380ms">
          {stats.jobsByExperienceLevel.length > 0 ? (
            <div className="space-y-3">
              {stats.jobsByExperienceLevel.map((item) => {
                const width = Math.max((item.count / maxExperienceCount) * 100, 8);
                return (
                  <div key={item.level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.level}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--rf-muted)]">{isPt ? "Ainda sem dados de experiencia." : "No experience data yet."}</p>
          )}
        </DataCard>
      </section>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--rf-muted)]">{label}</span>
      <span className="rf-number text-zinc-100">{value.toLocaleString()}</span>
    </div>
  );
}

function MiniRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2 flex items-center justify-between"
      style={{ borderColor: "var(--rf-border)" }}
    >
      <span className="text-xs text-[var(--rf-muted)]">{label}</span>
      <span className={`rf-number text-sm font-semibold ${tone}`}>{value.toLocaleString()}</span>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--rf-border)", background: "rgba(11, 15, 20, 0.65)" }}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--rf-muted)] font-mono">{label}</p>
      <p className={`rf-number text-3xl font-bold mt-2 ${tone}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--rf-muted)] mt-1">{helper}</p>
    </div>
  );
}

function PipelineStageCard({
  stage,
  compact,
}: {
  stage: PipelineStage;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex-1 min-w-[124px] ${compact ? "" : "rf-glow"}`}
      style={{
        borderColor:
          stage.value > 0
            ? "rgba(56, 189, 248, 0.24)"
            : "rgba(31, 42, 55, 0.95)",
        background:
          stage.value > 0 ? "rgba(15, 22, 33, 0.95)" : "rgba(11, 15, 20, 0.75)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono">
          {stage.label}
        </span>
        <span className={`text-xs font-mono ${stage.toneClass}`}>{stage.glyph}</span>
      </div>
      <p className={`rf-number text-2xl font-bold ${stage.toneClass}`}>{stage.value.toLocaleString()}</p>
    </div>
  );
}

function DataCard({
  title,
  delay,
  children,
}: {
  title: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className="rf-animate-in rounded-xl border p-5"
      style={{
        animationDelay: delay,
        borderColor: "var(--rf-border)",
        background: "rgba(15, 22, 33, 0.9)",
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
        {title}
      </p>
      {children}
    </article>
  );
}
