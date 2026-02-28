import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

interface WorkableJob {
  title: string;
  shortcode: string;
  code?: string;
  employment_type?: string;
  telecommuting?: boolean;
  department?: string;
  url: string;
  shortlink?: string;
  application_url?: string;
  published_on?: string;
  created_at?: string;
  country?: string;
  city?: string;
  state?: string;
  industry?: string;
}

interface WorkableResponse {
  name?: string;
  jobs?: WorkableJob[];
}

function normalizeClientName(source: SourceRecord): string {
  if (source.externalKey && source.externalKey.trim().length > 0) {
    return source.externalKey.trim();
  }
  if (source.repo && source.repo.trim().length > 0) {
    return source.repo.trim();
  }
  return source.fullName.replace(/^workable\//, "");
}

function dateToIso(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export const workableWidgetConnector: SourceConnector = {
  type: "workable_widget",
  ...SOURCE_POLICY.workable_widget,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const clientName = normalizeClientName(source);
    const started = Date.now();
    const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(clientName)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReplyFlow-SourceConnector/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Workable API error (${res.status}) for ${clientName}`);
    }

    const payload = (await res.json()) as WorkableResponse;
    const jobs = payload.jobs || [];
    const sinceTs = since ? Date.parse(since) : null;

    return {
      jobs: jobs
        .filter((job) => {
          if (!sinceTs) return true;
          const publishedTs = Date.parse(dateToIso(job.published_on));
          return !Number.isNaN(publishedTs) && publishedTs >= sinceTs;
        })
        .map((job) => {
          const createdAt = dateToIso(job.published_on || job.created_at);
          const locationParts: string[] = [];
          if (job.city) locationParts.push(job.city);
          if (job.state) locationParts.push(job.state);
          if (job.country) locationParts.push(job.country);
          if (job.telecommuting) locationParts.push("Remote");

          const labels: string[] = [];
          if (job.department) labels.push(job.department);
          if (job.employment_type) labels.push(job.employment_type);
          if (job.industry) labels.push(job.industry);

          const bodyParts: string[] = [];
          if (locationParts.length > 0) bodyParts.push(`Location: ${locationParts.join(", ")}`);
          if (job.department) bodyParts.push(`Department: ${job.department}`);
          if (job.industry) bodyParts.push(`Industry: ${job.industry}`);
          if (job.employment_type) bodyParts.push(`Employment: ${job.employment_type}`);

          return {
            externalJobId: job.shortcode,
            issueUrl: job.url || job.shortlink || `https://apply.workable.com/j/${job.shortcode}`,
            issueNumber: 0,
            title: job.title,
            body: bodyParts.filter(Boolean).join("\n\n"),
            labels,
            createdAt,
            updatedAt: createdAt,
            posterUsername: "workable",
            posterAvatarUrl: null,
            commentsCount: 0,
            applyUrl: job.application_url || job.url || null,
          };
        }),
      httpStatus: res.status,
      latencyMs: Date.now() - started,
    };
  },
};
