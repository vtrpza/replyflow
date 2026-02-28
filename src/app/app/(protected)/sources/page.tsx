"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton, Tooltip, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { BILLING_ENABLED } from "@/lib/config";
import { captureEvent } from "@/lib/analytics";
import {
  BILLING_UPGRADE_ROUTE,
  getDailyResetLabel,
  getUpgradeMessage,
  usePlanSnapshot,
} from "@/lib/plan/client";

type SourceType =
  | "github_repo"
  | "greenhouse_board"
  | "lever_postings"
  | "ashby_board"
  | "workable_widget"
  | "recruitee_careers";

interface Source {
  id: string;
  sourceType: SourceType;
  displayName: string | null;
  fullName: string;
  url: string;
  enabled: boolean;
  category: string;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  totalJobsFetched: number;
  lastScrapedAt: string | null;
  attributionLabel: string | null;
  attributionUrl: string | null;
  termsUrl: string | null;
  syncIntervalMinutes: number;
  regionTags: string[];
}

interface ValidateResult {
  source: string;
  fetched: number;
  latencyMs: number;
  health: {
    score: number;
    status: string;
  };
}

const SOURCE_TYPE_META: Record<SourceType, { label: string; color: string; placeholder: string; description: string }> = {
  github_repo: {
    label: "GitHub",
    color: "bg-zinc-700 text-zinc-200",
    placeholder: "owner/repo",
    description: "GitHub Issues connector for job repos",
  },
  greenhouse_board: {
    label: "Greenhouse",
    color: "bg-green-500/15 text-green-300",
    placeholder: "board token (e.g. nubank)",
    description: "Greenhouse Job Board public API",
  },
  lever_postings: {
    label: "Lever",
    color: "bg-blue-500/15 text-blue-300",
    placeholder: "site token (e.g. atlassian)",
    description: "Lever Postings public API",
  },
  ashby_board: {
    label: "Ashby",
    color: "bg-purple-500/15 text-purple-300",
    placeholder: "board name (e.g. notion)",
    description: "Ashby Job Board public API",
  },
  workable_widget: {
    label: "Workable",
    color: "bg-cyan-500/15 text-cyan-300",
    placeholder: "client name (e.g. sennder)",
    description: "Workable Widget public API",
  },
  recruitee_careers: {
    label: "Recruitee",
    color: "bg-amber-500/15 text-amber-300",
    placeholder: "company slug (e.g. channable)",
    description: "Recruitee Careers Site public API",
  },
};

function statusClass(status: Source["healthStatus"]): string {
  if (status === "healthy") return "bg-emerald-500/10 text-emerald-300";
  if (status === "warning") return "bg-amber-500/10 text-amber-300";
  return "bg-red-500/10 text-red-300";
}

export default function SourcesPage() {
  const router = useRouter();
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const { snapshot } = usePlanSnapshot();

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    sourceType: "github_repo" as SourceType,
    fullName: "",
    externalKey: "",
    displayName: "",
    category: "",
  });

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      toast.error(isPt ? "Falha ao carregar fontes" : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, [toast, isPt]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleUpgradeRequired = (data: unknown): void => {
    if (!BILLING_ENABLED) return;
    toast.error(getUpgradeMessage(data, isPt));
    router.push(BILLING_UPGRADE_ROUTE);
  };

  const toggleSource = async (source: Source) => {
    setSavingId(source.id);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { handleUpgradeRequired(data); return; }
        toast.error(data.error || (isPt ? "Falha ao atualizar fonte" : "Failed to update source"));
        return;
      }
      await loadSources();
      toast.success(isPt ? "Fonte atualizada" : "Source updated");
    } catch {
      toast.error(isPt ? "Falha ao atualizar fonte" : "Failed to update source");
    } finally {
      setSavingId(null);
    }
  };

  const validateSource = async (source: Source) => {
    setValidatingId(source.id);
    try {
      const res = await fetch(`/api/sources/${source.id}/validate`, { method: "POST" });
      const data = (await res.json()) as ValidateResult & { error?: string };
      if (!res.ok) {
        if (res.status === 402) { handleUpgradeRequired(data); return; }
        toast.error(data.error || (isPt ? "Falha ao validar fonte" : "Failed to validate source"));
        return;
      }
      toast.success(
        isPt
          ? `${data.source}: ${data.fetched} vagas, ${data.health.score} pontos`
          : `${data.source}: ${data.fetched} jobs, ${data.health.score} score`
      );
      await loadSources();
    } catch {
      toast.error(isPt ? "Falha ao validar fonte" : "Failed to validate source");
    } finally {
      setValidatingId(null);
    }
  };

  const syncSource = async (source: Source) => {
    setSyncingId(source.id);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { handleUpgradeRequired(data); return; }
        toast.error(data.error || (isPt ? "Falha no sync" : "Sync failed"));
        return;
      }
      captureEvent("source_synced", { source_id: source.id, source_type: source.sourceType });
      await loadSources();
    } catch {
      toast.error(isPt ? "Falha no sync" : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const addSource = async () => {
    try {
      const body: Record<string, string> = {
        sourceType: form.sourceType,
        displayName: form.displayName,
        category: form.category || "community",
      };

      if (form.sourceType === "github_repo") {
        body.fullName = form.fullName.trim();
      } else {
        body.externalKey = form.externalKey.trim();
      }

      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { handleUpgradeRequired(data); return; }
        toast.error(data.error || (isPt ? "Falha ao adicionar fonte" : "Failed to add source"));
        return;
      }

      captureEvent("source_added", { source_type: form.sourceType });
      setForm({ sourceType: "github_repo", fullName: "", externalKey: "", displayName: "", category: "" });
      setShowAddForm(false);
      toast.success(isPt ? "Fonte adicionada" : "Source added");
      await loadSources();
    } catch {
      toast.error(isPt ? "Falha ao adicionar fonte" : "Failed to add source");
    }
  };

  const filteredSources = sources.filter((source) => {
    if (filterType && source.sourceType !== filterType) return false;
    if (filterStatus === "enabled" && !source.enabled) return false;
    if (filterStatus === "disabled" && source.enabled) return false;
    if (filterStatus === "critical" && source.healthStatus !== "critical") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (source.displayName || source.fullName).toLowerCase();
      if (!name.includes(q) && !source.fullName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const typeCounts = sources.reduce((acc, s) => {
    acc[s.sourceType] = (acc[s.sourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const meta = SOURCE_TYPE_META[form.sourceType];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{isPt ? "Fontes" : "Sources"}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isPt
              ? `${sources.length} fontes conectadas · ${sources.filter((s) => s.enabled).length} ativas`
              : `${sources.length} sources connected · ${sources.filter((s) => s.enabled).length} active`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          {showAddForm ? (isPt ? "Cancelar" : "Cancel") : (isPt ? "+ Adicionar fonte" : "+ Add source")}
        </button>
      </div>

      {/* Usage stats bar */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-400">{isPt ? "Plano atual" : "Current plan"}</p>
            <p className="text-sm text-zinc-100 font-medium uppercase">
              {snapshot?.plan ?? (isPt ? "indisponivel" : "unavailable")}
            </p>
          </div>
          <div className="text-xs text-zinc-400">
            {getDailyResetLabel(snapshot?.sourceUsage.dayStart, isPt)}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
            <p className="text-zinc-400">{isPt ? "Sync manual hoje" : "Manual syncs today"}</p>
            <p className="text-zinc-100 font-medium">
              {snapshot?.sourceUsage.manualSyncUsed ?? 0} /{" "}
              {snapshot?.sourceLimits.manualSyncPerDay !== undefined && snapshot.sourceLimits.manualSyncPerDay < 0
                ? isPt ? "Ilimitado" : "Unlimited"
                : snapshot?.sourceLimits.manualSyncPerDay ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
            <p className="text-zinc-400">{isPt ? "Validacoes hoje" : "Validations today"}</p>
            <p className="text-zinc-100 font-medium">
              {snapshot?.sourceUsage.sourceValidationsUsed ?? 0} /{" "}
              {snapshot?.sourceLimits.sourceValidationsPerDay !== undefined && snapshot.sourceLimits.sourceValidationsPerDay < 0
                ? isPt ? "Ilimitado" : "Unlimited"
                : snapshot?.sourceLimits.sourceValidationsPerDay ?? "--"}
            </p>
          </div>
        </div>
      </div>

      {/* Add source form */}
      {showAddForm && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">{isPt ? "Adicionar fonte" : "Add source"}</h2>
            <Tooltip
              content={
                isPt
                  ? "Todos os conectores usam somente endpoints publicos de APIs de vagas."
                  : "All connectors use only public job listing API endpoints."
              }
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">?</span>
            </Tooltip>
          </div>

          {/* Source type selector grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {(Object.keys(SOURCE_TYPE_META) as SourceType[]).map((type) => {
              const m = SOURCE_TYPE_META[type];
              return (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, sourceType: type, fullName: "", externalKey: "" })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.sourceType === type
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${m.color}`}>
                    {m.label}
                  </span>
                  <p className="text-xs text-zinc-500 leading-tight mt-1">{m.description}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {form.sourceType === "github_repo" ? (
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder={meta.placeholder}
                className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            ) : (
              <input
                value={form.externalKey}
                onChange={(e) => setForm({ ...form, externalKey: e.target.value })}
                placeholder={meta.placeholder}
                className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            )}
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder={isPt ? "Nome de exibicao" : "Display name"}
              className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder={isPt ? "Categoria (opcional)" : "Category (optional)"}
              className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <LoadingButton onClick={addSource} loading={false} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              {isPt ? "Adicionar" : "Add"}
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isPt ? "Buscar fontes..." : "Search sources..."}
          className="flex-1 min-w-[180px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">{isPt ? "Todos os tipos" : "All types"} ({sources.length})</option>
          {(Object.keys(SOURCE_TYPE_META) as SourceType[]).map((type) => (
            <option key={type} value={type}>
              {SOURCE_TYPE_META[type].label} ({typeCounts[type] || 0})
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">{isPt ? "Todos os status" : "All statuses"}</option>
          <option value="enabled">{isPt ? "Ativas" : "Enabled"}</option>
          <option value="disabled">{isPt ? "Desativadas" : "Disabled"}</option>
          <option value="critical">{isPt ? "Criticas" : "Critical"}</option>
        </select>
      </div>

      {/* Sources list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-200 font-medium">
            {sources.length === 0
              ? (isPt ? "Nenhuma fonte conectada ainda" : "No sources connected yet")
              : (isPt ? "Nenhuma fonte corresponde aos filtros" : "No sources match your filters")}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            {sources.length === 0
              ? (isPt ? "Clique em \"+Adicionar fonte\" para comecar." : "Click \"+Add source\" to get started.")
              : (isPt ? "Tente ajustar os filtros." : "Try adjusting your filters.")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSources.map((source) => {
            const stm = SOURCE_TYPE_META[source.sourceType] || SOURCE_TYPE_META.github_repo;
            return (
              <div
                key={source.id}
                className={`rounded-lg border bg-zinc-900 p-4 transition-colors ${
                  source.enabled ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800/50 opacity-60"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-zinc-100 font-medium truncate">
                        {source.displayName || source.fullName}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${stm.color}`}>
                        {stm.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusClass(source.healthStatus)}`}>
                        {source.healthStatus} {Math.round(source.healthScore)}
                      </span>
                      {!source.enabled && (
                        <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500">
                          {isPt ? "Desativada" : "Disabled"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 break-all">{source.fullName}</p>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{isPt ? "Vagas" : "Jobs"}: <span className="text-zinc-300">{source.totalJobsFetched}</span></span>
                      <span>{isPt ? "Intervalo" : "Interval"}: <span className="text-zinc-300">{source.syncIntervalMinutes}m</span></span>
                      <span>
                        {isPt ? "Ultimo sync" : "Last sync"}:{" "}
                        <span className="text-zinc-300">
                          {source.lastScrapedAt ? new Date(source.lastScrapedAt).toLocaleString() : (isPt ? "nunca" : "never")}
                        </span>
                      </span>
                    </div>
                    <div className="text-xs mt-1 flex flex-wrap gap-3">
                      {source.attributionUrl && (
                        <a href={source.attributionUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                          {source.attributionLabel || "Attribution"}
                        </a>
                      )}
                      {source.termsUrl && (
                        <a href={source.termsUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200">
                          {isPt ? "Termos" : "Terms"}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleSource(source)}
                      disabled={savingId === source.id}
                      className={`px-3 py-1.5 text-xs rounded-lg text-white transition-colors ${
                        source.enabled
                          ? "bg-zinc-700 hover:bg-zinc-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {savingId === source.id
                        ? "..."
                        : source.enabled
                          ? (isPt ? "Desativar" : "Disable")
                          : (isPt ? "Ativar" : "Enable")}
                    </button>
                    <button
                      onClick={() => validateSource(source)}
                      disabled={validatingId === source.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white transition-colors"
                    >
                      {validatingId === source.id ? "..." : (isPt ? "Validar" : "Validate")}
                    </button>
                    <button
                      onClick={() => syncSource(source)}
                      disabled={syncingId === source.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                    >
                      {syncingId === source.id ? "..." : (isPt ? "Sincronizar" : "Sync")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
