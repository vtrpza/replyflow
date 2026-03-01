import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  assertWithinSourceEnableQuota,
  ensureUserExists,
  getEffectivePlan,
  upgradeRequiredResponse,
} from "@/lib/plan";
import { recordPlanIntentEvent } from "@/lib/plan/intent-events";
import { SOURCE_POLICY } from "@/lib/sources/policy";
import type { SourceType } from "@/lib/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseGithubFullName(fullName: string): { owner: string; repo: string } | null {
  const parts = fullName.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

function normalizeSourceInput(body: Record<string, unknown>): {
  sourceType: SourceType;
  displayName: string | null;
  owner: string;
  repo: string;
  externalKey: string | null;
  fullName: string;
  url: string;
  category: string;
  technology: string | null;
  enabled: boolean;
  regionTagsJson: string;
  discoveryConfidence: number;
  autoDiscovered: boolean;
} {
  const sourceType = String(body.sourceType || "github_repo") as SourceType;
  const displayName = body.displayName ? String(body.displayName) : null;
  const category = body.category ? String(body.category) : sourceType === "github_repo" ? "community" : "ats";
  const technology = body.technology ? String(body.technology) : null;
  const enabled = body.enabled !== undefined ? !!body.enabled : true;
  const regionTags = Array.isArray(body.regionTags)
    ? body.regionTags.map((tag) => String(tag))
    : ["BR", "LATAM"];

  if (sourceType === "github_repo") {
    const fullNameInput = body.fullName ? String(body.fullName) : `${String(body.owner || "")}/${String(body.repo || "")}`;
    const parsed = parseGithubFullName(fullNameInput);
    if (!parsed) {
      throw new Error("GitHub source requires fullName in owner/repo format");
    }

    return {
      sourceType,
      displayName: displayName || fullNameInput,
      owner: parsed.owner,
      repo: parsed.repo,
      externalKey: `${parsed.owner}/${parsed.repo}`,
      fullName: `${parsed.owner}/${parsed.repo}`,
      url: body.url ? String(body.url) : `https://github.com/${parsed.owner}/${parsed.repo}`,
      category,
      technology,
      enabled,
      regionTagsJson: JSON.stringify(regionTags),
      discoveryConfidence: typeof body.discoveryConfidence === "number" ? body.discoveryConfidence : 100,
      autoDiscovered: !!body.autoDiscovered,
    };
  }

  const externalKey = body.externalKey ? String(body.externalKey).trim() : "";
  if (!externalKey) {
    throw new Error(`${sourceType} source requires externalKey`);
  }

  const prefixMap: Record<string, string> = {
    greenhouse_board: "greenhouse",
    lever_postings: "lever",
    ashby_board: "ashby",
    workable_widget: "workable",
    recruitee_careers: "recruitee",
  };
  const prefix = prefixMap[sourceType] || sourceType;
  const fullName = `${prefix}/${externalKey}`;

  const urlMap: Record<string, string> = {
    greenhouse_board: `https://boards.greenhouse.io/${externalKey}`,
    lever_postings: `https://jobs.lever.co/${externalKey}`,
    ashby_board: `https://jobs.ashbyhq.com/${externalKey}`,
    workable_widget: `https://apply.workable.com/${externalKey}`,
    recruitee_careers: `https://${externalKey}.recruitee.com`,
  };

  return {
    sourceType,
    displayName: displayName || fullName,
    owner: sourceType,
    repo: externalKey,
    externalKey,
    fullName,
    url: body.url ? String(body.url) : (urlMap[sourceType] || `https://${externalKey}`),
    category,
    technology,
    enabled,
    regionTagsJson: JSON.stringify(regionTags),
    discoveryConfidence: typeof body.discoveryConfidence === "number" ? body.discoveryConfidence : 100,
    autoDiscovered: !!body.autoDiscovered,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = ensureUserExists(session);

    const sourceType = request.nextUrl.searchParams.get("sourceType");
    const status = request.nextUrl.searchParams.get("status");

    let rows = db
      .select()
      .from(schema.repoSources)
      .where(eq(schema.repoSources.userId, userId))
      .all();

    if (sourceType) {
      rows = rows.filter((row) => row.sourceType === sourceType);
    }
    if (status === "enabled") {
      rows = rows.filter((row) => row.enabled);
    }
    if (status === "disabled") {
      rows = rows.filter((row) => !row.enabled);
    }

    return NextResponse.json({
      sources: rows.map((row) => ({
        ...row,
        regionTags: parseJson<string[]>(row.regionTagsJson, []),
        healthBreakdown: parseJson<Record<string, number>>(row.healthBreakdownJson, {}),
      })),
    });
  } catch (error) {
    console.error("Sources GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const body = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeSourceInput(body);

    const existing = db
      .select({ id: schema.repoSources.id })
      .from(schema.repoSources)
      .where(
        and(
          eq(schema.repoSources.userId, userId),
          eq(schema.repoSources.fullName, normalized.fullName)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json({ error: "Source already exists" }, { status: 409 });
    }

    if (normalized.enabled) {
      const enableCheck = assertWithinSourceEnableQuota(userId, normalized.sourceType);
      if (!enableCheck.ok) {
        return NextResponse.json(
          upgradeRequiredResponse(enableCheck.feature, enableCheck.limit, enableCheck.period),
          { status: 402 }
        );
      }
    }

    const policy = SOURCE_POLICY[normalized.sourceType];
    const now = new Date().toISOString();

    db.insert(schema.repoSources)
      .values({
        id: generateId(),
        userId,
        sourceType: normalized.sourceType,
        displayName: normalized.displayName,
        owner: normalized.owner,
        repo: normalized.repo,
        externalKey: normalized.externalKey,
        fullName: normalized.fullName,
        url: normalized.url,
        category: normalized.category,
        technology: normalized.technology,
        attributionLabel: policy.attributionLabel,
        attributionUrl: policy.attributionUrl,
        termsUrl: policy.termsUrl,
        termsAcceptedAt: now,
        enabled: normalized.enabled,
        healthScore: 100,
        healthStatus: "healthy",
        healthBreakdownJson: JSON.stringify({ fetchReliability: 100, freshness: 100, parsingQuality: 100, compliance: 100, stability: 100 }),
        consecutiveFailures: 0,
        syncIntervalMinutes: 30,
        nextSyncAt: now,
        autoDiscovered: normalized.autoDiscovered,
        discoveryConfidence: normalized.discoveryConfidence,
        regionTagsJson: normalized.regionTagsJson,
        lastScrapedAt: null,
        totalJobsFetched: 0,
      })
      .run();

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_source_add",
      route: "/api/sources",
      metadata: {
        sourceType: normalized.sourceType,
        enabled: normalized.enabled,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sources POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create source" },
      { status: 400 }
    );
  }
}
