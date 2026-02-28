import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  department?: string;
  team?: string;
  isRemote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  address?: {
    postalAddress?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  compensation?: {
    compensationTierSummary?: string;
  };
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

function normalizeBoardName(source: SourceRecord): string {
  if (source.externalKey && source.externalKey.trim().length > 0) {
    return source.externalKey.trim();
  }
  if (source.repo && source.repo.trim().length > 0) {
    return source.repo.trim();
  }
  return source.fullName.replace(/^ashby\//, "");
}

function isoOrNow(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export const ashbyBoardConnector: SourceConnector = {
  type: "ashby_board",
  ...SOURCE_POLICY.ashby_board,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const boardName = normalizeBoardName(source);
    const started = Date.now();
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}?includeCompensation=true`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReplyFlow-SourceConnector/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Ashby API error (${res.status}) for ${boardName}`);
    }

    const payload = (await res.json()) as AshbyResponse;
    const jobs = payload.jobs || [];
    const sinceTs = since ? Date.parse(since) : null;

    return {
      jobs: jobs
        .filter((job) => {
          if (!sinceTs) return true;
          const publishedTs = Date.parse(isoOrNow(job.publishedAt));
          return !Number.isNaN(publishedTs) && publishedTs >= sinceTs;
        })
        .map((job) => {
          const publishedAt = isoOrNow(job.publishedAt);
          const locationParts: string[] = [];
          if (job.location) locationParts.push(job.location);
          if (job.isRemote || job.workplaceType === "Remote") locationParts.push("Remote");

          const labels: string[] = [];
          if (job.department) labels.push(job.department);
          if (job.team) labels.push(job.team);
          if (job.employmentType) labels.push(job.employmentType);
          if (job.workplaceType) labels.push(job.workplaceType);

          const bodyParts: string[] = [];
          if (locationParts.length > 0) bodyParts.push(`Location: ${locationParts.join(", ")}`);
          if (job.compensation?.compensationTierSummary) {
            bodyParts.push(`Compensation: ${job.compensation.compensationTierSummary}`);
          }
          bodyParts.push(job.descriptionPlain || job.descriptionHtml || "");

          return {
            externalJobId: job.id,
            issueUrl: job.jobUrl || `https://jobs.ashbyhq.com/${boardName}/${job.id}`,
            issueNumber: 0,
            title: job.title,
            body: bodyParts.filter(Boolean).join("\n\n"),
            labels,
            createdAt: publishedAt,
            updatedAt: publishedAt,
            posterUsername: "ashby",
            posterAvatarUrl: null,
            commentsCount: 0,
            applyUrl: job.applyUrl || job.jobUrl || null,
          };
        }),
      httpStatus: res.status,
      latencyMs: Date.now() - started,
    };
  },
};
