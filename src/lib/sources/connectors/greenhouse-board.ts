import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url?: string;
  updated_at?: string;
  content?: string;
  location?: { name?: string };
  metadata?: Array<{ name?: string; value?: string }>;
}

function normalizeBoardToken(source: SourceRecord): string {
  if (source.externalKey && source.externalKey.trim().length > 0) {
    return source.externalKey.trim();
  }
  if (source.repo && source.repo.trim().length > 0) {
    return source.repo.trim();
  }
  return source.fullName.replace(/^greenhouse\//, "");
}

function isoOrNow(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export const greenhouseBoardConnector: SourceConnector = {
  type: "greenhouse_board",
  ...SOURCE_POLICY.greenhouse_board,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const boardToken = normalizeBoardToken(source);
    const started = Date.now();
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReplyFlow-SourceConnector/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Greenhouse API error (${res.status}) for ${boardToken}`);
    }

    const payload = (await res.json()) as { jobs?: GreenhouseJob[] };
    const jobs = payload.jobs || [];
    const sinceTs = since ? Date.parse(since) : null;

    return {
      jobs: jobs
        .filter((job) => {
          if (!sinceTs) return true;
          const updatedTs = Date.parse(isoOrNow(job.updated_at));
          return !Number.isNaN(updatedTs) && updatedTs >= sinceTs;
        })
        .map((job) => {
          const updatedAt = isoOrNow(job.updated_at);
          const createdAt = updatedAt;
          const applyUrl = job.absolute_url || null;
          const location = job.location?.name;
          const metadataLabels = (job.metadata || [])
            .map((item) => item.name || item.value || "")
            .filter((item) => item.length > 0);

          return {
            externalJobId: String(job.id),
            issueUrl: applyUrl || `https://boards.greenhouse.io/${boardToken}/jobs/${job.id}`,
            issueNumber: job.id,
            title: job.title,
            body: [location ? `Location: ${location}` : null, job.content || ""].filter(Boolean).join("\n\n"),
            labels: metadataLabels,
            createdAt,
            updatedAt,
            posterUsername: "greenhouse",
            posterAvatarUrl: null,
            commentsCount: 0,
            applyUrl,
          };
        }),
      httpStatus: res.status,
      latencyMs: Date.now() - started,
    };
  },
};
