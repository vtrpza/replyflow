import type { SourceType } from "@/lib/types";

export interface SourceRecord {
  id: string;
  userId: string;
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
  syncIntervalMinutes: number;
  lastScrapedAt: string | null;
}

export interface NormalizedSourceJob {
  externalJobId: string;
  issueUrl: string;
  issueNumber: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  posterUsername: string;
  posterAvatarUrl: string | null;
  commentsCount: number;
  applyUrl: string | null;
}

export interface SourceFetchResult {
  jobs: NormalizedSourceJob[];
  httpStatus: number | null;
  latencyMs: number;
}

export interface SourceConnector {
  type: SourceType;
  attributionLabel: string;
  attributionUrl: string;
  termsUrl: string;
  fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult>;
}

export interface SourceHealthBreakdown {
  fetchReliability: number;
  freshness: number;
  parsingQuality: number;
  compliance: number;
  stability: number;
}

export interface SourceHealthResult {
  score: number;
  status: "healthy" | "warning" | "critical";
  breakdown: SourceHealthBreakdown;
  throttleMinutes: number;
}
