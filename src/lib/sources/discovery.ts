import fs from "fs";
import path from "path";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { SOURCE_POLICY } from "@/lib/sources/policy";
import { getEffectivePlan, getSourceCounts, getSourceLimitsForPlan } from "@/lib/plan";
import type { SourceType } from "@/lib/types";

interface EcosystemRepo {
  owner?: string;
  repo?: string;
  fullName: string;
  url: string;
  category?: string;
  technology?: string;
  activityLevel?: string;
  updatedAt?: string | null;
  type?: string;
}

interface EcosystemData {
  githubRepos?: {
    byCategory?: EcosystemRepo[];
    byTechnology?: EcosystemRepo[];
    aggregatorsAndMeta?: EcosystemRepo[];
    portugal?: EcosystemRepo[];
  };
}

interface AtsCatalogSource {
  sourceType: "greenhouse_board" | "lever_postings" | "ashby_board" | "workable_widget" | "recruitee_careers";
  externalKey: string;
  displayName?: string;
  category?: string;
  regionTags?: string[];
  confidence?: number;
  enabledByDefault?: boolean;
  url?: string;
}

interface AtsCatalogFile {
  sources?: AtsCatalogSource[];
}

interface InsertDiscoveredSourceInput {
  userId: string;
  sourceType: SourceType;
  displayName: string;
  owner: string;
  repo: string;
  externalKey: string;
  fullName: string;
  url: string;
  category: string;
  technology: string | null;
  regionTags: string[];
  confidence: number;
  enabled: boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseOwnerRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  return { owner: owner || "unknown", repo: repo || "unknown" };
}

function scoreGithubCandidate(repo: EcosystemRepo): number {
  const level = (repo.activityLevel || "").toLowerCase();
  let score = 70;
  if (level === "very_active") score += 20;
  if (level === "active") score += 12;
  if (level === "moderate") score += 4;

  if (repo.type === "general_jobs" || repo.type === "php_jobs") {
    score += 8;
  }

  if (repo.updatedAt) {
    const updated = Date.parse(repo.updatedAt);
    if (!Number.isNaN(updated)) {
      const days = (Date.now() - updated) / (1000 * 60 * 60 * 24);
      if (days <= 14) score += 5;
      else if (days > 90) score -= 12;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function normalizeConfidence(value: number | undefined, fallback = 80): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeRegionTags(tags: string[] | undefined, fallback: string[]): string[] {
  if (!tags || tags.length === 0) {
    return fallback;
  }

  const cleaned = tags
    .map((tag) => String(tag || "").trim().toUpperCase())
    .filter((tag) => tag.length > 0);

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

function makeGithubRegionTags(repo: EcosystemRepo): string[] {
  if ((repo.category || "").toLowerCase().includes("portugal")) {
    return ["PT", "LATAM", "INTL_LATAM_FRIENDLY"];
  }
  return ["BR", "LATAM", "INTL_LATAM_FRIENDLY"];
}

function loadAtsSources(catalogPath: string): AtsCatalogSource[] {
  if (!fs.existsSync(catalogPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as AtsCatalogFile | AtsCatalogSource[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return Array.isArray(parsed.sources) ? parsed.sources : [];
  } catch {
    return [];
  }
}

function getAtsSourceUrl(source: AtsCatalogSource): string {
  if (source.url && source.url.trim().length > 0) {
    return source.url.trim();
  }

  const urlMap: Record<string, string> = {
    greenhouse_board: `https://boards.greenhouse.io/${source.externalKey}`,
    lever_postings: `https://jobs.lever.co/${source.externalKey}`,
    ashby_board: `https://jobs.ashbyhq.com/${source.externalKey}`,
    workable_widget: `https://apply.workable.com/${source.externalKey}`,
    recruitee_careers: `https://${source.externalKey}.recruitee.com`,
  };
  return urlMap[source.sourceType] || `https://${source.externalKey}`;
}

function insertDiscoveredSource(input: InsertDiscoveredSourceInput): { created: boolean; autoEnabled: boolean } {
  const existing = db
    .select({ id: schema.repoSources.id })
    .from(schema.repoSources)
    .where(
      and(
        eq(schema.repoSources.userId, input.userId),
        eq(schema.repoSources.fullName, input.fullName)
      )
    )
    .get();

  if (existing) {
    return { created: false, autoEnabled: false };
  }

  const policy = SOURCE_POLICY[input.sourceType];

  db.insert(schema.repoSources)
    .values({
      id: generateId(),
      userId: input.userId,
      sourceType: input.sourceType,
      displayName: input.displayName,
      owner: input.owner,
      repo: input.repo,
      externalKey: input.externalKey,
      fullName: input.fullName,
      url: input.url,
      category: input.category,
      technology: input.technology,
      attributionLabel: policy.attributionLabel,
      attributionUrl: policy.attributionUrl,
      termsUrl: policy.termsUrl,
      enabled: input.enabled,
      autoDiscovered: true,
      discoveryConfidence: input.confidence,
      regionTagsJson: JSON.stringify(input.regionTags),
      healthScore: 100,
      healthStatus: "healthy",
      healthBreakdownJson: JSON.stringify({
        fetchReliability: 100,
        freshness: 100,
        parsingQuality: 100,
        compliance: 100,
        stability: 100,
      }),
      syncIntervalMinutes: 30,
      nextSyncAt: new Date().toISOString(),
      lastScrapedAt: null,
      totalJobsFetched: 0,
    })
    .run();

  return { created: true, autoEnabled: input.enabled };
}

export function runSourceDiscovery(userId: string, minAutoEnableConfidence = 80): { created: number; autoEnabled: number } {
  let created = 0;
  let autoEnabled = 0;
  const plan = getEffectivePlan(userId);
  const sourceLimits = getSourceLimitsForPlan(plan);
  const sourceCounts = getSourceCounts(userId);
  let remainingEnabledSlots = sourceLimits.enabledSources < 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, sourceLimits.enabledSources - sourceCounts.enabledSources);
  let remainingAtsSlots = sourceLimits.enabledAtsSources < 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, sourceLimits.enabledAtsSources - sourceCounts.enabledAtsSources);

  const canAutoEnable = (sourceType: SourceType): boolean => {
    const isAts = sourceType !== "github_repo";
    if (remainingEnabledSlots <= 0) {
      return false;
    }
    if (isAts && remainingAtsSlots <= 0) {
      return false;
    }
    return true;
  };

  const consumeEnableSlot = (sourceType: SourceType): void => {
    const isAts = sourceType !== "github_repo";
    if (remainingEnabledSlots !== Number.POSITIVE_INFINITY) {
      remainingEnabledSlots -= 1;
    }
    if (isAts && remainingAtsSlots !== Number.POSITIVE_INFINITY) {
      remainingAtsSlots -= 1;
    }
  };

  const ecosystemPath = path.join(process.cwd(), "seed", "brazilian-job-ecosystem.json");
  if (fs.existsSync(ecosystemPath)) {
    const ecosystem = JSON.parse(fs.readFileSync(ecosystemPath, "utf-8")) as EcosystemData;
    const groups = ecosystem.githubRepos || {};
    const candidates: EcosystemRepo[] = [
      ...(groups.byCategory || []),
      ...(groups.byTechnology || []),
      ...((groups.aggregatorsAndMeta || []).filter((item) => item.type === "general_jobs" || item.type === "php_jobs")),
      ...(groups.portugal || []),
    ];

    for (const candidate of candidates) {
      if (!candidate.fullName || !candidate.url) {
        continue;
      }

      const fullName = candidate.fullName.trim();
      const ownerRepo = parseOwnerRepo(fullName);
      const confidence = scoreGithubCandidate(candidate);
      const shouldEnable = confidence >= minAutoEnableConfidence && canAutoEnable("github_repo");

      const inserted = insertDiscoveredSource({
        userId,
        sourceType: "github_repo",
        displayName: fullName,
        owner: candidate.owner || ownerRepo.owner,
        repo: candidate.repo || ownerRepo.repo,
        externalKey: fullName,
        fullName,
        url: candidate.url,
        category: candidate.category || candidate.type || "general",
        technology: candidate.technology || null,
        regionTags: makeGithubRegionTags(candidate),
        confidence,
        enabled: shouldEnable,
      });

      if (inserted.created) {
        created += 1;
        if (inserted.autoEnabled) {
          autoEnabled += 1;
          consumeEnableSlot("github_repo");
        }
      }
    }
  }

  const atsCatalogPath = path.join(process.cwd(), "seed", "international-ats-sources.json");
  const atsSources = loadAtsSources(atsCatalogPath);

  for (const source of atsSources) {
    const externalKey = String(source.externalKey || "").trim();
    if (!externalKey) {
      continue;
    }

    const validAtsTypes = ["greenhouse_board", "lever_postings", "ashby_board", "workable_widget", "recruitee_careers"] as const;
    if (!validAtsTypes.includes(source.sourceType as typeof validAtsTypes[number])) {
      continue;
    }

    const confidence = normalizeConfidence(source.confidence, 80);
    // All connectors are enabled by default; only explicit false disables
    const shouldEnableCandidate = source.enabledByDefault === false ? false : true;
    const shouldEnable = shouldEnableCandidate && canAutoEnable(source.sourceType as SourceType);

    const prefixMap: Record<string, string> = {
      greenhouse_board: "greenhouse",
      lever_postings: "lever",
      ashby_board: "ashby",
      workable_widget: "workable",
      recruitee_careers: "recruitee",
    };
    const prefix = prefixMap[source.sourceType] || source.sourceType;
    const fullName = `${prefix}/${externalKey}`;

    const inserted = insertDiscoveredSource({
      userId,
      sourceType: source.sourceType as SourceType,
      displayName: source.displayName?.trim() || fullName,
      owner: source.sourceType,
      repo: externalKey,
      externalKey,
      fullName,
      url: getAtsSourceUrl(source),
      category: source.category?.trim() || "ats",
      technology: null,
      regionTags: normalizeRegionTags(source.regionTags, ["LATAM", "INTL_LATAM_FRIENDLY"]),
      confidence,
      enabled: shouldEnable,
    });

    if (inserted.created) {
      created += 1;
      if (inserted.autoEnabled) {
        autoEnabled += 1;
        consumeEnableSlot(source.sourceType as SourceType);
      }
    }
  }

  return { created, autoEnabled };
}
