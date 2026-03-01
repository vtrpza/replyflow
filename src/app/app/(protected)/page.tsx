"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  EmptyState,
  LoadingButton,
  LoadingOverlay,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

interface Stats {
  totalJobs: number;
  newJobsToday: number;
  newJobsThisWeek: number;
  totalReposMonitored: number;
  totalOutreachSent: number;
  totalReplies: number;
  totalInterviews: number;
  remoteJobs: number;
  jobsWithEmail?: number;
  jobsWithDirectEmail?: number;
  contactsTotal?: number;
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
  contractCoverage?: {
    classifiedJobs: number;
    unknownJobs: number;
    coveragePct: number;
  };
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
  const [initialSyncing, setInitialSyncing] = useState<boolean>(false);
  const initialSyncTriggered = useRef(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() =>
        toast.error(
          isPt
            ? "Falha ao carregar as métricas do dashboard"
            : "Failed to load dashboard metrics"
        )
      )
      .finally(() => setLoading(false));
  }, [toast, isPt]);

  // Auto-sync on first visit when user has sources but no jobs yet
  useEffect(() => {
    if (
      !stats ||
      initialSyncTriggered.current ||
      stats.totalReposMonitored <= 0 ||
      stats.totalJobs > 0
    ) {
      return;
    }

    initialSyncTriggered.current = true;
    setInitialSyncing(true);

    fetch("/api/sync", { method: "POST", body: JSON.stringify({}) })
      .then((r) => r.json())
      .then(() => fetch("/api/stats"))
      .then((r) => r.json())
      .then(setStats)
      .catch(() =>
        toast.error(
          isPt
            ? "Falha na sincronização inicial"
            : "Initial sync failed"
        )
      )
      .finally(() => setInitialSyncing(false));
  }, [stats, toast, isPt]);

  const handleCalculateScores = async (): Promise<void> => {
    setCalculating(true);
    try {
      const res = await fetch("/api/jobs/match", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        toast.success(
          isPt
            ? `Sinais recalculados para ${result.updatedCount} vagas`
            : `Signals recalculated for ${result.updatedCount} jobs`
        );
        const statsRes = await fetch("/api/stats");
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${result.error}`);
      }
    } catch {
      toast.error(
        isPt
          ? "Falha ao recalcular os sinais"
          : "Failed to recalculate signals"
      );
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-12 w-80 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (initialSyncing) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--rf-muted)] font-mono">
            {isPt
              ? "Preparando seu painel... Isso pode levar alguns segundos."
              : "Preparing your panel... This may take a few seconds."}
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          title={isPt ? "Ainda não há dados" : "No data yet"}
          message={
            isPt
              ? "Sincronize vagas para iniciar seu painel de execução."
              : "Sync jobs to start your execution panel."
          }
          icon={<span className="text-2xl font-mono text-[var(--rf-cyan)]">$</span>}
        />
      </div>
    );
  }

  const directContactsInCrm = stats.contactsTotal ?? 0;
  const replyRate = toPercent(stats.totalReplies, stats.totalOutreachSent);
  const interviewRate = toPercent(stats.totalInterviews, stats.totalReplies);
  const interviewStageCount = stats.outreachInterviewing + stats.outreachAccepted;

  const contractCoverage = stats.contractCoverage ?? {
    classifiedJobs: stats.jobsByContractType
      .filter((item) => item.type !== "Unknown")
      .reduce((sum, item) => sum + item.count, 0),
    unknownJobs: stats.jobsByContractType
      .filter((item) => item.type === "Unknown")
      .reduce((sum, item) => sum + item.count, 0),
    coveragePct: toPercent(
      stats.jobsByContractType
        .filter((item) => item.type !== "Unknown")
        .reduce((sum, item) => sum + item.count, 0),
      stats.totalJobs
    ),
  };

  const topRepos = stats.jobsByRepo.slice(0, 6);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <WelcomeModal />
      <OnboardingChecklist />

      <LoadingOverlay
        show={calculating}
        message={
          isPt
            ? "Recalculando sinais de prioridade..."
            : "Recalculating priority signals..."
        }
      />

      <section
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: "var(--rf-border)",
          background:
            "linear-gradient(180deg, rgba(15, 22, 33, 0.95) 0%, rgba(11, 15, 20, 0.95) 100%)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rf-muted)] font-mono">
              {isPt ? "Painel de execução" : "Execution panel"}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {isPt ? "Visão semanal da sua busca" : "Weekly view of your search"}
            </h1>
            <p className="text-sm text-[var(--rf-muted)] mt-2">
              {isPt
                ? "Métricas essenciais para decidir o que executar hoje."
                : "Essential metrics to decide what to execute today."}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className="text-xs font-mono text-[var(--rf-muted)]">
              {isPt ? "Último recálculo" : "Last recalculation"}: {" "}
              {formatTimestamp(
                stats.matchScoreLastCalculated,
                isPt ? "pt-BR" : "en-US",
                isPt ? "nunca" : "never",
                isPt ? "inválido" : "invalid"
              )}
            </span>
            <LoadingButton
              onClick={handleCalculateScores}
              loading={calculating}
              className="rounded-lg text-[var(--rf-bg)] hover:opacity-90"
              style={{ background: "var(--rf-gradient)" }}
            >
              {isPt ? "Recalcular sinais" : "Recalculate signals"}
            </LoadingButton>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label={isPt ? "Vagas mapeadas" : "Mapped jobs"}
          value={stats.totalJobs}
          helper={isPt ? `${stats.newJobsThisWeek} novas na semana` : `${stats.newJobsThisWeek} new this week`}
          tone="text-cyan-300"
        />
        <KpiCard
          label={isPt ? "Contatos diretos no CRM" : "Direct contacts in CRM"}
          value={directContactsInCrm}
          helper={isPt ? "Contatos únicos salvos" : "Unique saved contacts"}
          tone="text-emerald-300"
        />
        <KpiCard
          label="ATS-only"
          value={stats.jobsAtsOnly}
          helper={isPt ? "Sem e-mail extraído no scrape" : "No scraped email found"}
          tone="text-amber-300"
        />
        <KpiCard
          label={isPt ? "Replies" : "Replies"}
          value={stats.totalReplies}
          helper={isPt ? `${replyRate}% dos envios` : `${replyRate}% from sent`}
          tone="text-green-300"
        />
      </section>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono">
            {isPt ? "Funil de execução" : "Execution funnel"}
          </h2>
          <span className="text-xs font-mono text-[var(--rf-muted)]">
            {isPt ? "Entrevistas" : "Interviews"}: <span className="text-white">{interviewStageCount}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <PipelineMini
            label={isPt ? "Rascunho" : "Draft"}
            value={stats.outreachDrafted}
          />
          <PipelineMini
            label={isPt ? "Enviado" : "Sent"}
            value={stats.outreachSentOnly}
          />
          <PipelineMini
            label="Follow-up"
            value={stats.outreachFollowedUp}
          />
          <PipelineMini
            label={isPt ? "Respondeu" : "Replied"}
            value={stats.outreachReplied}
          />
          <PipelineMini
            label={isPt ? "Entrevista" : "Interview"}
            value={interviewStageCount}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-[var(--rf-muted)]">
          <p className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
            {isPt ? "Taxa de resposta" : "Reply rate"}: <span className="text-cyan-300">{replyRate}%</span>
          </p>
          <p className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--rf-border)" }}>
            {isPt ? "Taxa de entrevista" : "Interview rate"}: <span className="text-emerald-300">{interviewRate}%</span>
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataCard title={isPt ? "Tipos de contrato" : "Contract types"}>
          <p className="text-xs text-[var(--rf-muted)] font-mono mb-3">
            {isPt ? "Cobertura de classificação" : "Classification coverage"}: {contractCoverage.coveragePct}%
            {" "}({contractCoverage.classifiedJobs}/{stats.totalJobs})
          </p>
          <div className="space-y-3">
            {stats.jobsByContractType.length > 0 ? (
              stats.jobsByContractType.map((item) => {
                const width = Math.max((item.count / Math.max(stats.totalJobs, 1)) * 100, 6);
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.type}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.type === "Unknown" ? "bg-zinc-500/80" : "bg-cyan-400/80"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--rf-muted)]">
                {isPt ? "Sem dados de contrato ainda." : "No contract data yet."}
              </p>
            )}
          </div>
        </DataCard>

        <DataCard title={isPt ? "Top fontes" : "Top sources"}>
          {topRepos.length > 0 ? (
            <div className="space-y-3">
              {topRepos.map((item) => {
                const width = Math.max((item.count / Math.max(topRepos[0]?.count || 1, 1)) * 100, 8);
                return (
                  <div key={item.repo}>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="text-zinc-300 truncate font-mono max-w-[200px]">{item.repo}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, background: "var(--rf-gradient)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--rf-muted)]">
              {isPt ? "Sem dados por fonte ainda." : "No source data yet."}
            </p>
          )}
        </DataCard>

        <DataCard title={isPt ? "Níveis de experiência" : "Experience levels"}>
          {stats.jobsByExperienceLevel.length > 0 ? (
            <div className="space-y-3">
              {stats.jobsByExperienceLevel.map((item) => {
                const width = Math.max(
                  (item.count / Math.max(...stats.jobsByExperienceLevel.map((entry) => entry.count), 1)) * 100,
                  8
                );
                return (
                  <div key={item.level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.level}</span>
                      <span className="rf-number text-[var(--rf-muted)]">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--rf-muted)]">
              {isPt ? "Sem dados de experiência ainda." : "No experience data yet."}
            </p>
          )}
        </DataCard>
      </section>

      <section className="text-xs text-[var(--rf-muted)] font-mono">
        {isPt
          ? "Detalhes de contatos (CRM, mascarados/desbloqueados) ficam na aba Contatos."
          : "Contact details (CRM, masked/unlocked) live in the Contacts tab."}
      </section>
    </div>
  );
}

function KpiCard({
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
    <article
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono">{label}</p>
      <p className={`rf-number text-3xl font-bold mt-2 ${tone}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--rf-muted)] mt-1">{helper}</p>
    </article>
  );
}

function PipelineMini({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg border px-3 py-3"
      style={{ borderColor: "var(--rf-border)", background: "rgba(11, 15, 20, 0.7)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--rf-muted)] font-mono">{label}</p>
      <p className="rf-number text-xl text-white mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function DataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">{title}</p>
      {children}
    </article>
  );
}
