"use client";

import { useCallback, useEffect, useState } from "react";

export type ClientPlanType = "free" | "pro";
export type UpgradePeriod = "month" | "day" | "total";
export type UpgradeFeatureKey =
  | "drafts"
  | "sends"
  | "reveals"
  | "accounts"
  | "sources_enabled"
  | "ats_sources_enabled"
  | "syncs_daily"
  | "source_validations_daily";

export interface UpgradeRequiredPayload {
  error?: string;
  feature?: UpgradeFeatureKey;
  limit?: number;
  period?: UpgradePeriod;
}

export interface PlanSnapshot {
  plan: ClientPlanType;
  usage: {
    revealsUsed: number;
    draftsUsed: number;
    sendsUsed: number;
    periodStart: string;
  };
  limits: {
    reveals: number;
    drafts: number;
    sends: number;
    accounts: number;
    historyItems: number;
  };
  sourceUsage: {
    dayStart: string;
    manualSyncUsed: number;
    sourceValidationsUsed: number;
  };
  sourceLimits: {
    enabledSources: number;
    enabledAtsSources: number;
    manualSyncPerDay: number;
    sourceValidationsPerDay: number;
  };
  enabledSources: number;
  enabledAtsSources: number;
}

export interface UsePlanSnapshotResult {
  snapshot: PlanSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const BILLING_UPGRADE_ROUTE = "/app/billing";

function asNumber(value: unknown, fallback: number = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asPlan(value: unknown): ClientPlanType {
  return value === "pro" ? "pro" : "free";
}

function asPeriod(value: unknown): UpgradePeriod {
  if (value === "day" || value === "total") {
    return value;
  }
  return "month";
}

function asFeature(value: unknown): UpgradeFeatureKey | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const supported: UpgradeFeatureKey[] = [
    "drafts",
    "sends",
    "reveals",
    "accounts",
    "sources_enabled",
    "ats_sources_enabled",
    "syncs_daily",
    "source_validations_daily",
  ];
  return supported.includes(value as UpgradeFeatureKey) ? (value as UpgradeFeatureKey) : undefined;
}

export function formatLimit(limit: number | undefined, isPt: boolean): string {
  if (typeof limit !== "number") {
    return "--";
  }
  if (limit < 0) {
    return isPt ? "Ilimitado" : "Unlimited";
  }
  return String(limit);
}

export function parseUpgradePayload(data: unknown): UpgradeRequiredPayload | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const parsed = data as Record<string, unknown>;
  return {
    error: asString(parsed.error),
    feature: asFeature(parsed.feature),
    limit: typeof parsed.limit === "number" ? parsed.limit : undefined,
    period: asPeriod(parsed.period),
  };
}

export function getUpgradeMessage(data: unknown, isPt: boolean): string {
  const payload = parseUpgradePayload(data);
  if (!payload || payload.error !== "upgrade_required") {
    return isPt ? "Acao indisponivel no plano atual." : "Action unavailable on the current plan.";
  }

  const featureLabel = (() => {
    switch (payload.feature) {
      case "reveals":
        return isPt ? "revelacoes de contato" : "contact reveals";
      case "drafts":
        return isPt ? "rascunhos" : "drafts";
      case "sends":
        return isPt ? "envios" : "sends";
      case "accounts":
        return isPt ? "contas de email conectadas" : "connected email accounts";
      case "sources_enabled":
        return isPt ? "fontes ativas" : "active sources";
      case "ats_sources_enabled":
        return isPt ? "fontes ATS ativas" : "active ATS sources";
      case "syncs_daily":
        return isPt ? "sincronizacoes manuais" : "manual syncs";
      case "source_validations_daily":
        return isPt ? "validacoes de fonte" : "source validations";
      default:
        return isPt ? "acoes" : "actions";
    }
  })();

  const limitValue = typeof payload.limit === "number" && payload.limit >= 0 ? payload.limit : null;

  if (payload.feature === "accounts") {
    if (isPt) {
      return `Plano Free inclui ${limitValue ?? 1} conta de email conectada. Faca upgrade para Pro para conectar mais.`;
    }
    return `Free includes ${limitValue ?? 1} connected email account. Upgrade to Pro to connect more.`;
  }

  if (payload.period === "day") {
    if (isPt) {
      return `Voce atingiu o limite diario de ${featureLabel} (${limitValue ?? "--"}/dia). Tente amanha ou faca upgrade para Pro.`;
    }
    return `You hit the daily limit for ${featureLabel} (${limitValue ?? "--"}/day). Try tomorrow or upgrade to Pro.`;
  }

  if (payload.period === "total") {
    if (isPt) {
      return `Voce atingiu o limite total de ${featureLabel} (${limitValue ?? "--"} no total). Faca upgrade para Pro para continuar agora.`;
    }
    return `You hit the total limit for ${featureLabel} (${limitValue ?? "--"} total). Upgrade to Pro to continue now.`;
  }

  if (isPt) {
    return `Voce atingiu o limite mensal de ${featureLabel} (${limitValue ?? "--"}/mes). Faca upgrade para Pro para continuar agora.`;
  }
  return `You hit the monthly limit for ${featureLabel} (${limitValue ?? "--"}/month). Upgrade to Pro to continue now.`;
}

export function getMonthlyResetLabel(periodStart: string | undefined, isPt: boolean): string {
  if (!periodStart) {
    return isPt ? "Renovacao mensal automatica" : "Monthly reset";
  }

  const startDate = new Date(`${periodStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return isPt ? "Renovacao mensal automatica" : "Monthly reset";
  }

  const next = new Date(startDate);
  next.setMonth(next.getMonth() + 1);
  return isPt
    ? `Renova em ${next.toLocaleDateString("pt-BR")}`
    : `Resets on ${next.toLocaleDateString("en-US")}`;
}

export function getDailyResetLabel(dayStart: string | undefined, isPt: boolean): string {
  if (!dayStart) {
    return isPt ? "Renovacao diaria automatica" : "Daily reset";
  }

  const startDate = new Date(`${dayStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return isPt ? "Renovacao diaria automatica" : "Daily reset";
  }

  const next = new Date(startDate);
  next.setDate(next.getDate() + 1);
  return isPt
    ? `Renova em ${next.toLocaleDateString("pt-BR")}`
    : `Resets on ${next.toLocaleDateString("en-US")}`;
}

function toPlanSnapshot(data: unknown): PlanSnapshot | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  if (payload.error) {
    return null;
  }

  return {
    plan: asPlan(payload.plan),
    usage: {
      revealsUsed: asNumber((payload.usage as Record<string, unknown> | undefined)?.revealsUsed, 0),
      draftsUsed: asNumber((payload.usage as Record<string, unknown> | undefined)?.draftsUsed, 0),
      sendsUsed: asNumber((payload.usage as Record<string, unknown> | undefined)?.sendsUsed, 0),
      periodStart: asString((payload.usage as Record<string, unknown> | undefined)?.periodStart, ""),
    },
    limits: {
      reveals: asNumber((payload.limits as Record<string, unknown> | undefined)?.reveals, 50),
      drafts: asNumber((payload.limits as Record<string, unknown> | undefined)?.drafts, 30),
      sends: asNumber((payload.limits as Record<string, unknown> | undefined)?.sends, 10),
      accounts: asNumber((payload.limits as Record<string, unknown> | undefined)?.accounts, 1),
      historyItems: asNumber((payload.limits as Record<string, unknown> | undefined)?.historyItems, 30),
    },
    sourceUsage: {
      dayStart: asString((payload.sourceUsage as Record<string, unknown> | undefined)?.dayStart, ""),
      manualSyncUsed: asNumber((payload.sourceUsage as Record<string, unknown> | undefined)?.manualSyncUsed, 0),
      sourceValidationsUsed: asNumber((payload.sourceUsage as Record<string, unknown> | undefined)?.sourceValidationsUsed, 0),
    },
    sourceLimits: {
      enabledSources: asNumber((payload.sourceLimits as Record<string, unknown> | undefined)?.enabledSources, -1),
      enabledAtsSources: asNumber((payload.sourceLimits as Record<string, unknown> | undefined)?.enabledAtsSources, -1),
      manualSyncPerDay: asNumber((payload.sourceLimits as Record<string, unknown> | undefined)?.manualSyncPerDay, -1),
      sourceValidationsPerDay: asNumber((payload.sourceLimits as Record<string, unknown> | undefined)?.sourceValidationsPerDay, -1),
    },
    enabledSources: asNumber(payload.enabledSources, 0),
    enabledAtsSources: asNumber(payload.enabledAtsSources, 0),
  };
}

export function usePlanSnapshot(enabled: boolean = true): UsePlanSnapshotResult {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stats", { cache: "no-store" });
      const data = (await response.json()) as unknown;
      if (!response.ok) {
        setSnapshot(null);
        return;
      }
      setSnapshot(toPlanSnapshot(data));
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, loading, refresh };
}
