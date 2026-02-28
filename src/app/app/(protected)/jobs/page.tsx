"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, LoadingButton, SkeletonList, Tooltip, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { BILLING_ENABLED } from "@/lib/config";
import { analytics, captureEvent } from "@/lib/analytics";
import type { InputLengthBucket } from "@/lib/analytics";
import {
  BILLING_UPGRADE_ROUTE,
  formatLimit,
  getMonthlyResetLabel,
  getUpgradeMessage,
  usePlanSnapshot,
} from "@/lib/plan/client";

interface Job {
  id: string;
  issueUrl: string;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  repoFullName: string;
  company: string | null;
  salary: string | null;
  location: string | null;
  contractType: string | null;
  experienceLevel: string | null;
  techStack: string[];
  isRemote: boolean;
  applyUrl: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  matchScore: number | null;
  opportunityScore?: number;
  sourceType: string;
  source?: {
    id: string;
    type: string;
    displayName: string;
    healthScore: number;
    healthStatus: "healthy" | "warning" | "critical";
    attributionLabel: string | null;
    attributionUrl: string | null;
  } | null;
  matchExplain?: {
    reasons: string[];
    missingSkills: string[];
    breakdown: {
      skills: number;
      remote: number;
      contract: number;
      level: number;
      location: number;
    };
  };
  outreachStatus: string;
  isRevealed: boolean;
  hasContact: boolean;
  isStale?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  github_repo: { label: "GitHub", color: "bg-zinc-700 text-zinc-200" },
  greenhouse_board: { label: "Greenhouse", color: "bg-green-500/15 text-green-300" },
  lever_postings: { label: "Lever", color: "bg-blue-500/15 text-blue-300" },
  ashby_board: { label: "Ashby", color: "bg-purple-500/15 text-purple-300" },
  workable_widget: { label: "Workable", color: "bg-cyan-500/15 text-cyan-300" },
  recruitee_careers: { label: "Recruitee", color: "bg-amber-500/15 text-amber-300" },
};

export default function JobsPage() {
  const router = useRouter();
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const { snapshot, refresh: refreshPlanSnapshot } = usePlanSnapshot();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    remote: "",
    contractType: "",
    level: "",
    role: "",
    outreachStatus: "",
    contactType: "",
    minMatchScore: "",
    sort: "newest",
    hideStale: "true",
    sourceType: "",
    sourceId: "",
  });
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [draftingJob, setDraftingJob] = useState<string | null>(null);
  const [revealingJob, setRevealingJob] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const getOutreachStatusLabel = (status: string): string => {
    if (!isPt) {
      return status.replace("_", " ");
    }
    const labels: Record<string, string> = {
      none: "sem contato",
      email_drafted: "rascunho criado",
      email_sent: "enviado",
      followed_up: "follow-up",
      replied: "respondeu",
      interviewing: "entrevista",
      applied_ats: "ats aplicado",
      accepted: "aceito",
      rejected: "rejeitado",
    };
    return labels[status] || status.replace("_", " ");
  };

  const fetchJobs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sort: filters.sort,
      });
      if (search) params.set("search", search);
      if (filters.remote) params.set("remote", filters.remote);
      if (filters.contractType) params.set("contractType", filters.contractType);
      if (filters.level) params.set("level", filters.level);
      if (filters.role) params.set("role", filters.role);
      if (filters.outreachStatus) params.set("outreachStatus", filters.outreachStatus);
      if (filters.contactType) params.set("contactType", filters.contactType);
      if (filters.minMatchScore) params.set("minMatchScore", filters.minMatchScore);
      if (filters.sourceType) params.set("sourceType", filters.sourceType);
      if (filters.sourceId) params.set("sourceId", filters.sourceId);
      params.set("hideStale", filters.hideStale);

      try {
        const res = await fetch(`/api/jobs?${params.toString()}`);
        if (!res.ok) throw new Error(isPt ? "Falha ao buscar vagas" : "Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : isPt ? "Ocorreu um erro" : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [search, filters, isPt]
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDraftEmail = async (jobId: string) => {
    setDraftingJob(jobId);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, language: "pt-BR" }),
      });

      const data = await res.json();
      if (BILLING_ENABLED && res.status === 402 && data?.error === "upgrade_required") {
        toast.error(getUpgradeMessage(data, isPt));
        router.push(BILLING_UPGRADE_ROUTE);
        return;
      }

      if (data.success) {
        captureEvent("job_draft_created", { job_id: jobId });
        if (!data.existing) {
          captureEvent("job_added", { job_id: jobId, method: "draft" });
        }
        if (!data.existing && data.analytics) {
          analytics.replyCreated({
            is_first_reply: data.analytics.is_first_reply,
            reply_type: data.analytics.reply_type,
            input_length_bucket: data.analytics.input_length_bucket as InputLengthBucket,
          });
        }
        toast.success(
          isPt
            ? "Rascunho criado! Veja em Outreach."
            : "Email draft created! Check Outreach."
        );
        void refreshPlanSnapshot();
        fetchJobs(pagination.page);
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${data.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao criar rascunho" : "Failed to create draft");
    } finally {
      setDraftingJob(null);
    }
  };

  const handleReveal = async (jobId: string) => {
    setRevealingJob(jobId);
    try {
      const res = await fetch("/api/jobs/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();

      if (BILLING_ENABLED && res.status === 402 && data?.error === "upgrade_required") {
        toast.error(getUpgradeMessage(data, isPt));
        router.push(BILLING_UPGRADE_ROUTE);
        return;
      }

      if (data.success) {
        captureEvent("job_contact_revealed", { job_id: jobId });
        toast.success(isPt ? "Contato revelado" : "Contact revealed");
        void refreshPlanSnapshot();
        fetchJobs(pagination.page);
      } else {
        toast.error(data.error || (isPt ? "Falha ao revelar contato" : "Failed to reveal contact"));
      }
    } catch {
      toast.error(isPt ? "Falha ao revelar contato" : "Failed to reveal contact");
    } finally {
      setRevealingJob(null);
    }
  };

  const handleSaveLead = async (jobId: string) => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || (isPt ? "Falha ao salvar lead" : "Failed to save lead"));
        return;
      }
      captureEvent("job_lead_saved", { job_id: jobId });
      toast.success(isPt ? "Lead salvo no banco de recrutadores" : "Lead saved to recruiter bank");
    } catch {
      toast.error(isPt ? "Falha ao salvar lead" : "Failed to save lead");
    }
  };

  const handleAtsApplied = async (jobId: string) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, outreachStatus: "applied_ats" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || (isPt ? "Falha ao atualizar status" : "Failed to update status"));
        return;
      }
      captureEvent("job_ats_applied", { job_id: jobId });
      captureEvent("job_added", { job_id: jobId, method: "ats_applied" });
      toast.success(isPt ? "Marcado como ATS aplicado" : "Marked as ATS applied");
      fetchJobs(pagination.page);
    } catch {
      toast.error(isPt ? "Falha ao atualizar status" : "Failed to update status");
    }
  };

  const activeFilterCount = [
    filters.remote,
    filters.contractType,
    filters.level,
    filters.role,
    filters.outreachStatus,
    filters.contactType,
    filters.minMatchScore,
    filters.sourceType,
    filters.sourceId,
    filters.hideStale === "false" ? "show_stale" : "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      remote: "",
      contractType: "",
      level: "",
      role: "",
      outreachStatus: "",
      contactType: "",
      minMatchScore: "",
      sort: "newest",
      hideStale: "true",
      sourceType: "",
      sourceId: "",
    });
    setSearch("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{isPt ? "Vagas" : "Jobs"}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isPt
            ? `${pagination.total} vagas encontradas`
            : `${pagination.total} jobs found`}
        </p>
      </div>

      {/* Usage bar */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-zinc-300">
            {isPt ? "Uso mensal" : "Monthly usage"}:{" "}
            <span className="text-zinc-100 font-medium">
              {isPt ? "Revelacoes" : "Reveals"} {snapshot?.usage.revealsUsed ?? 0} / {formatLimit(snapshot?.limits.reveals, isPt)}
            </span>
            <span className="mx-2 text-zinc-600">|</span>
            <span className="text-zinc-100 font-medium">
              {isPt ? "Rascunhos" : "Drafts"} {snapshot?.usage.draftsUsed ?? 0} / {formatLimit(snapshot?.limits.drafts, isPt)}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            {getMonthlyResetLabel(snapshot?.usage.periodStart, isPt)}
          </p>
        </div>
      </div>

      {/* Search + Quick filters bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            placeholder={isPt ? "Buscar vagas, empresas, stack..." : "Search jobs, companies, tech..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={filters.sourceType}
          onChange={(e) => setFilters({ ...filters, sourceType: e.target.value, sourceId: "" })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">{isPt ? "Todas as fontes" : "All Sources"}</option>
          <option value="github_repo">GitHub</option>
          <option value="greenhouse_board">Greenhouse</option>
          <option value="lever_postings">Lever</option>
          <option value="ashby_board">Ashby</option>
          <option value="workable_widget">Workable</option>
          <option value="recruitee_careers">Recruitee</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="newest">{isPt ? "Mais recentes" : "Newest First"}</option>
          <option value="opportunity">{isPt ? "Melhor oportunidade" : "Best Opportunity"}</option>
          <option value="updated">{isPt ? "Atividade recente" : "Recent Activity"}</option>
          <option value="matchScore">{isPt ? "Melhor match" : "Best Match"}</option>
          <option value="oldest">{isPt ? "Mais antigas" : "Oldest First"}</option>
          <option value="comments">{isPt ? "Mais comentarios" : "Most Comments"}</option>
        </select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
            showFilters || activeFilterCount > 0
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          {isPt ? "Filtros" : "Filters"}
          {activeFilterCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-emerald-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 border border-zinc-700 bg-zinc-900 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {isPt ? "Limpar" : "Clear"}
          </button>
        )}
      </div>

      {/* Expanded filters panel */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Localizacao" : "Location"}</label>
              <select
                value={filters.remote}
                onChange={(e) => setFilters({ ...filters, remote: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todas" : "All"}</option>
                <option value="true">{isPt ? "Apenas remoto" : "Remote Only"}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Contrato" : "Contract"}</label>
              <select
                value={filters.contractType}
                onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todos" : "All"}</option>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Freela">Freela</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Nivel" : "Level"}</label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todos" : "All"}</option>
                <option value="Junior">Junior</option>
                <option value="Pleno">Pleno</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Outreach" : "Outreach"}</label>
              <select
                value={filters.outreachStatus}
                onChange={(e) => setFilters({ ...filters, outreachStatus: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todos" : "All"}</option>
                <option value="none">{isPt ? "Sem contato" : "Not Contacted"}</option>
                <option value="email_drafted">{isPt ? "Rascunhado" : "Drafted"}</option>
                <option value="email_sent">{isPt ? "Enviado" : "Sent"}</option>
                <option value="followed_up">{isPt ? "Follow-up" : "Followed Up"}</option>
                <option value="replied">{isPt ? "Respondeu" : "Replied"}</option>
                <option value="interviewing">{isPt ? "Entrevista" : "Interviewing"}</option>
                <option value="applied_ats">{isPt ? "ATS aplicado" : "ATS Applied"}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Contato" : "Contact"}</label>
              <select
                value={filters.contactType}
                onChange={(e) => setFilters({ ...filters, contactType: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todos" : "All"}</option>
                <option value="hasEmail">{isPt ? "Com email" : "Has Email"}</option>
                <option value="atsOnly">{isPt ? "Somente ATS" : "ATS Only"}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Funcao" : "Role"}</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Todas" : "All"}</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="fullstack">Full Stack</option>
                <option value="devops">DevOps / SRE</option>
                <option value="mobile">Mobile</option>
                <option value="data">Data</option>
                <option value="qa">QA</option>
                <option value="lead">Lead / Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Match Score Min</label>
              <select
                value={filters.minMatchScore}
                onChange={(e) => setFilters({ ...filters, minMatchScore: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                <option value="">{isPt ? "Qualquer" : "Any"}</option>
                <option value="40">40%+</option>
                <option value="60">60%+</option>
                <option value="80">80%+</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300 w-full">
                <input
                  type="checkbox"
                  checked={filters.hideStale === "true"}
                  onChange={(e) => setFilters({ ...filters, hideStale: e.target.checked ? "true" : "false" })}
                  className="accent-emerald-500"
                />
                {isPt ? "Ocultar antigas" : "Hide stale"}
              </label>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList count={5} />
      ) : error ? (
        <div className="bg-zinc-900 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <LoadingButton onClick={() => fetchJobs()} loading={false}>
            {isPt ? "Tentar novamente" : "Try Again"}
          </LoadingButton>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title={isPt ? "Nenhuma vaga encontrada" : "No jobs found"}
          message={
            isPt
              ? "Tente sincronizar fontes primeiro ou ajuste os filtros."
              : "Try syncing sources first or adjust your filters."
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const sourceLabel = SOURCE_TYPE_LABELS[job.sourceType || job.source?.type || "github_repo"];
            return (
              <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <a
                          href={job.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-zinc-100 hover:text-emerald-400 break-words sm:truncate"
                        >
                          {job.title}
                        </a>
                        {job.matchScore !== null && (
                          <span
                            className={`sm:hidden text-xs font-medium px-2 py-0.5 rounded ${
                              job.matchScore >= 70
                                ? "bg-emerald-500/10 text-emerald-400"
                                : job.matchScore >= 40
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {job.matchScore}%
                          </span>
                        )}
                        {job.isRemote && (
                          <span className="shrink-0 px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">
                            {isPt ? "Remoto" : "Remote"}
                          </span>
                        )}
                        {!job.hasContact && job.applyUrl && (
                          <span className="shrink-0 px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded-full">
                            {isPt ? "Somente ATS" : "ATS Only"}
                          </span>
                        )}
                        {job.isStale && (
                          <span className="shrink-0 px-2 py-0.5 text-xs bg-zinc-700/70 text-zinc-300 rounded-full">
                            {isPt ? "Desatualizada" : "Stale"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                        {job.company && <span className="text-zinc-300">{job.company}</span>}
                        {sourceLabel && (
                          <button
                            onClick={() => setFilters({ ...filters, sourceType: job.sourceType || job.source?.type || "" })}
                            className={`px-1.5 py-0.5 text-xs rounded cursor-pointer hover:opacity-80 transition-opacity ${sourceLabel.color}`}
                            title={isPt ? "Filtrar por esta fonte" : "Filter by this source"}
                          >
                            {sourceLabel.label}
                          </button>
                        )}
                        {job.source?.displayName && (
                          <button
                            onClick={() => setFilters({ ...filters, sourceId: job.source?.id || "" })}
                            className="text-cyan-300 hover:text-cyan-200 cursor-pointer text-xs"
                            title={isPt ? "Filtrar por esta fonte" : "Filter by this source"}
                          >
                            {job.source.displayName}
                          </button>
                        )}
                        {job.salary && <span className="text-emerald-400">{job.salary}</span>}
                        {job.location && <span>{job.location}</span>}
                        {job.contractType && <span className="px-1.5 py-0.5 text-xs bg-zinc-800 rounded">{job.contractType}</span>}
                        {job.experienceLevel && <span className="px-1.5 py-0.5 text-xs bg-zinc-800 rounded">{job.experienceLevel}</span>}
                        <span className="text-xs">{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                      {job.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {job.techStack.slice(0, 8).map((tech) => (
                            <span key={tech} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {job.matchExplain?.reasons?.length ? (
                        <p className="text-xs text-cyan-300 mt-2">
                          {job.matchExplain.reasons[0]}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {job.matchScore !== null && (
                        <Tooltip
                          content={
                            job.matchExplain?.reasons?.length
                              ? job.matchExplain.reasons.slice(0, 2).join(" • ")
                              : isPt
                                ? "Score de match com base em skills, remoto, contrato, senioridade e local."
                                : "Match score based on skills, remote, contract, level, and location."
                          }
                        >
                          <span
                            className={`hidden sm:inline-block text-xs font-medium px-2 py-1 rounded ${
                              job.matchScore >= 70
                                ? "bg-emerald-500/10 text-emerald-400"
                                : job.matchScore >= 40
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {job.matchScore}%
                          </span>
                        </Tooltip>
                      )}
                      {job.opportunityScore !== undefined && (
                        <Tooltip
                          content={
                            isPt
                              ? "Opportunity = match + contato direto + ATS + frescor."
                              : "Opportunity = match + direct contact + ATS + freshness."
                          }
                        >
                          <span className="hidden sm:inline-block text-xs font-medium px-2 py-1 rounded bg-cyan-500/10 text-cyan-300">
                            OPP {Math.round(job.opportunityScore)}
                          </span>
                        </Tooltip>
                      )}
                      <button
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title={isPt ? "Expandir" : "Expand"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={expandedJob === job.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      </button>

                      {!job.isRevealed && job.hasContact && (
                        <button
                          onClick={() => handleReveal(job.id)}
                          disabled={revealingJob === job.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          {revealingJob === job.id ? "..." : isPt ? "Revelar" : "Reveal"}
                        </button>
                      )}

                      {job.outreachStatus === "none" && job.isRevealed && job.contactEmail && (
                        <button
                          onClick={() => handleDraftEmail(job.id)}
                          disabled={draftingJob === job.id}
                          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {draftingJob === job.id ? "..." : isPt ? "Rascunho" : "Draft"}
                        </button>
                      )}

                      {job.outreachStatus === "none" && !job.hasContact && job.applyUrl && (
                        <>
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                          >
                            {isPt ? "ATS" : "ATS"}
                          </a>
                          <button
                            onClick={() => handleAtsApplied(job.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                          >
                            {isPt ? "Marcar aplicado" : "Mark applied"}
                          </button>
                        </>
                      )}

                      {job.outreachStatus !== "none" && (
                        <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded">
                          {getOutreachStatusLabel(job.outreachStatus)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {expandedJob === job.id && (
                  <div className="border-t border-zinc-800 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {job.contactEmail && (
                        <div>
                          <span className="text-xs text-zinc-500">Email:</span>
                          <p className="text-sm text-zinc-300">{job.contactEmail}</p>
                          {job.contactEmail !== "***" && (
                            <button
                              onClick={() => handleSaveLead(job.id)}
                              className="mt-2 px-2.5 py-1 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                            >
                              {isPt ? "Salvar lead" : "Save lead"}
                            </button>
                          )}
                        </div>
                      )}
                      {job.contactLinkedin && (
                        <div>
                          <span className="text-xs text-zinc-500">LinkedIn:</span>
                          <p className="text-sm text-blue-400">{job.contactLinkedin}</p>
                        </div>
                      )}
                    </div>
                    {job.source && (
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-zinc-500">{isPt ? "Fonte:" : "Source:"}</span>
                        <span className={`px-1.5 py-0.5 rounded ${SOURCE_TYPE_LABELS[job.source.type]?.color || "bg-zinc-800 text-zinc-300"}`}>
                          {SOURCE_TYPE_LABELS[job.source.type]?.label || job.source.type}
                        </span>
                        <span className="text-zinc-300">{job.source.displayName}</span>
                        {job.source.attributionUrl && (
                          <a href={job.source.attributionUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                            {job.source.attributionLabel || "API"}
                          </a>
                        )}
                      </div>
                    )}
                    {job.matchExplain?.reasons?.length ? (
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 mb-1">{isPt ? "Razoes de match" : "Match reasons"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.matchExplain.reasons.slice(0, 4).map((reason) => (
                            <span key={reason} className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-300 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {job.matchExplain?.missingSkills?.length ? (
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 mb-1">{isPt ? "Skill gaps" : "Skill gaps"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.matchExplain.missingSkills.slice(0, 6).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-300 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="bg-zinc-950 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
                        {job.body.substring(0, 2000)}
                        {job.body.length > 2000 && "..."}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => fetchJobs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-zinc-700"
          >
            {isPt ? "Anterior" : "Previous"}
          </button>
          <span className="text-sm text-zinc-500">
            {isPt
              ? `Pagina ${pagination.page} de ${pagination.totalPages}`
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </span>
          <button
            onClick={() => fetchJobs(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-zinc-700"
          >
            {isPt ? "Proxima" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
