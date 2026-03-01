"use client";

import { useEffect, useRef, useState } from "react";
import {
  EmptyState,
  LoadingOverlay,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import {
  PipelineCommandBar,
  SmartNudges,
  OutreachFunnel,
  KpiCard,
  SignalsBar,
  DataCard,
} from "@/components/dashboard";

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
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function Dashboard() {
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [initialSyncing, setInitialSyncing] = useState(false);
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
          isPt ? "Falha na sincronização inicial" : "Initial sync failed"
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
        <Skeleton className="h-40 rounded-2xl" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-56 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
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
          icon={
            <span className="text-2xl font-mono text-[var(--rf-cyan)]">$</span>
          }
        />
      </div>
    );
  }

  const directContactsInCrm = stats.contactsTotal ?? 0;
  const replyRate = toPercent(stats.totalReplies, stats.totalOutreachSent);

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

      {/* 1. Pipeline Command Bar */}
      <PipelineCommandBar
        totalReposMonitored={stats.totalReposMonitored}
        totalJobs={stats.totalJobs}
        totalOutreachSent={stats.totalOutreachSent}
        totalReplies={stats.totalReplies}
        newJobsToday={stats.newJobsToday}
        newJobsThisWeek={stats.newJobsThisWeek}
        outreachDrafted={stats.outreachDrafted}
        totalInterviews={stats.totalInterviews}
        isPt={isPt}
      />

      {/* 2. Smart Nudges */}
      <SmartNudges
        stats={stats}
        isPt={isPt}
        onRecalculate={handleCalculateScores}
      />

      {/* 3. Outreach Funnel */}
      <OutreachFunnel
        outreachDrafted={stats.outreachDrafted}
        outreachSentOnly={stats.outreachSentOnly}
        outreachFollowedUp={stats.outreachFollowedUp}
        outreachReplied={stats.outreachReplied}
        outreachInterviewing={stats.outreachInterviewing}
        outreachAccepted={stats.outreachAccepted}
        totalOutreachSent={stats.totalOutreachSent}
        totalReplies={stats.totalReplies}
        totalInterviews={stats.totalInterviews}
        isPt={isPt}
      />

      {/* 4. KPI Chips (compressed) */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label={isPt ? "Vagas mapeadas" : "Mapped jobs"}
          value={stats.totalJobs}
          helper={
            isPt
              ? `${stats.newJobsThisWeek} novas na semana`
              : `${stats.newJobsThisWeek} new this week`
          }
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
          label="Replies"
          value={stats.totalReplies}
          helper={isPt ? `${replyRate}% dos envios` : `${replyRate}% from sent`}
          tone="text-green-300"
        />
      </section>

      {/* 5. Signals Bar */}
      <SignalsBar
        matchScoreLastCalculated={stats.matchScoreLastCalculated}
        calculating={calculating}
        onRecalculate={handleCalculateScores}
        isPt={isPt}
      />

      {/* 6. Insights Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataCard title={isPt ? "Tipos de contrato" : "Contract types"}>
          <p className="text-xs text-[var(--rf-muted)] font-mono mb-3">
            {isPt ? "Cobertura de classificação" : "Classification coverage"}:{" "}
            {contractCoverage.coveragePct}% ({contractCoverage.classifiedJobs}/
            {stats.totalJobs})
          </p>
          <div className="space-y-3">
            {stats.jobsByContractType.length > 0 ? (
              stats.jobsByContractType.map((item) => {
                const width = Math.max(
                  (item.count / Math.max(stats.totalJobs, 1)) * 100,
                  6
                );
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.type}</span>
                      <span className="rf-number text-[var(--rf-muted)]">
                        {item.count}
                      </span>
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
                const width = Math.max(
                  (item.count / Math.max(topRepos[0]?.count || 1, 1)) * 100,
                  8
                );
                return (
                  <div key={item.repo}>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="text-zinc-300 truncate font-mono max-w-[200px]">
                        {item.repo}
                      </span>
                      <span className="rf-number text-[var(--rf-muted)]">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          background: "var(--rf-gradient)",
                        }}
                      />
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
                  (item.count /
                    Math.max(
                      ...stats.jobsByExperienceLevel.map((entry) => entry.count),
                      1
                    )) *
                    100,
                  8
                );
                return (
                  <div key={item.level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-200">{item.level}</span>
                      <span className="rf-number text-[var(--rf-muted)]">
                        {item.count}
                      </span>
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
            <p className="text-sm text-[var(--rf-muted)]">
              {isPt
                ? "Sem dados de experiência ainda."
                : "No experience data yet."}
            </p>
          )}
        </DataCard>
      </section>

      {/* 7. Footer Note */}
      <section className="text-xs text-[var(--rf-muted)] font-mono">
        {isPt
          ? "Detalhes de contatos (CRM, mascarados/desbloqueados) ficam na aba Contatos."
          : "Contact details (CRM, masked/unlocked) live in the Contacts tab."}
      </section>
    </div>
  );
}
