"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingButton, Tooltip, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type SourceType = "github_repo" | "greenhouse_board" | "lever_postings";

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

interface UpgradePayload {
  error?: string;
  feature?: string;
  limit?: number;
}

function statusClass(status: Source["healthStatus"]): string {
  if (status === "healthy") return "bg-emerald-500/10 text-emerald-300";
  if (status === "warning") return "bg-amber-500/10 text-amber-300";
  return "bg-red-500/10 text-red-300";
}

export default function SourcesPage() {
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
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

  const getUpgradeMessage = (data: UpgradePayload): string => {
    if (!data || data.error !== "upgrade_required") {
      return isPt ? "Acao indisponivel no plano atual" : "Action unavailable on current plan";
    }
    return isPt ? "Acao indisponivel no plano atual" : "Action unavailable on current plan";
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
        if (res.status === 402) {
          toast.error(getUpgradeMessage(data));
          return;
        }
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
        if (res.status === 402) {
          toast.error(getUpgradeMessage(data));
          return;
        }
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
        if (res.status === 402) {
          toast.error(getUpgradeMessage(data));
          return;
        }
        toast.error(data.error || (isPt ? "Falha ao adicionar fonte" : "Failed to add source"));
        return;
      }

      setForm({ sourceType: "github_repo", fullName: "", externalKey: "", displayName: "", category: "" });
      toast.success(isPt ? "Fonte adicionada" : "Source added");
      await loadSources();
    } catch {
      toast.error(isPt ? "Falha ao adicionar fonte" : "Failed to add source");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{isPt ? "Fontes" : "Sources"}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isPt
            ? "Gerencie conectores, health score e atribuicao/termos por fonte."
            : "Manage connectors, health score, and attribution/terms per source."}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-zinc-200">{isPt ? "Adicionar fonte" : "Add source"}</h2>
          <Tooltip
            content={
              isPt
                ? "Conectores Greenhouse/Lever usam somente endpoints oficiais de vagas publicadas."
                : "Greenhouse/Lever connectors use only official published-job API endpoints."
            }
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">?</span>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={form.sourceType}
            onChange={(e) => setForm({ ...form, sourceType: e.target.value as SourceType })}
            className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
          >
            <option value="github_repo">GitHub Repo</option>
            <option value="greenhouse_board">Greenhouse Board</option>
            <option value="lever_postings">Lever Site</option>
          </select>

          {form.sourceType === "github_repo" ? (
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="owner/repo"
              className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
            />
          ) : (
            <input
              value={form.externalKey}
              onChange={(e) => setForm({ ...form, externalKey: e.target.value })}
              placeholder={form.sourceType === "greenhouse_board" ? "board token" : "site token"}
              className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
            />
          )}

          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder={isPt ? "Nome de exibicao" : "Display name"}
            className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
          />

          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder={isPt ? "Categoria (opcional)" : "Category (optional)"}
            className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
          />

          <LoadingButton onClick={addSource} loading={false} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            {isPt ? "Adicionar" : "Add"}
          </LoadingButton>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">{isPt ? "Carregando fontes..." : "Loading sources..."}</p>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-zinc-100 font-medium truncate">{source.displayName || source.fullName}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(source.healthStatus)}`}>
                      {source.healthStatus} {Math.round(source.healthScore)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">{source.sourceType}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 break-all">{source.fullName}</p>
                  <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-3">
                    <span>{isPt ? "Total coletado" : "Fetched"}: {source.totalJobsFetched}</span>
                    <span>{isPt ? "Intervalo" : "Interval"}: {source.syncIntervalMinutes}m</span>
                    <span>
                      {isPt ? "Ultimo sync" : "Last sync"}: {source.lastScrapedAt ? new Date(source.lastScrapedAt).toLocaleString() : (isPt ? "nunca" : "never")}
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
                    className={`px-3 py-1.5 text-xs rounded-lg text-white ${source.enabled ? "bg-zinc-700 hover:bg-zinc-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    {savingId === source.id ? "..." : source.enabled ? (isPt ? "Desativar" : "Disable") : (isPt ? "Ativar" : "Enable")}
                  </button>
                  <button
                    onClick={() => validateSource(source)}
                    disabled={validatingId === source.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white"
                  >
                    {validatingId === source.id ? "..." : (isPt ? "Validar" : "Validate")}
                  </button>
                  <button
                    onClick={async () => {
                      setSyncingId(source.id);
                      try {
                        const res = await fetch("/api/sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sourceId: source.id }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          if (res.status === 402) {
                            toast.error(getUpgradeMessage(data));
                            return;
                          }
                          toast.error(data.error || (isPt ? "Falha no sync" : "Sync failed"));
                          return;
                        }
                        await loadSources();
                      } catch {
                        toast.error(isPt ? "Falha no sync" : "Sync failed");
                      } finally {
                        setSyncingId(null);
                      }
                    }}
                    disabled={syncingId === source.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white"
                  >
                    {syncingId === source.id ? "..." : (isPt ? "Sync" : "Sync")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
