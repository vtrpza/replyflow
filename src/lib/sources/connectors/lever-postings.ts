import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

interface LeverPosting {
  id: string;
  text: string;
  descriptionPlain?: string;
  description?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
  };
}

function normalizeSite(source: SourceRecord): string {
  if (source.externalKey && source.externalKey.trim().length > 0) {
    return source.externalKey.trim();
  }
  if (source.repo && source.repo.trim().length > 0) {
    return source.repo.trim();
  }
  return source.fullName.replace(/^lever\//, "");
}

function toIso(value?: number): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export const leverPostingsConnector: SourceConnector = {
  type: "lever_postings",
  ...SOURCE_POLICY.lever_postings,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const site = normalizeSite(source);
    const started = Date.now();
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReplyFlow-SourceConnector/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Lever API error (${res.status}) for ${site}`);
    }

    const postings = (await res.json()) as LeverPosting[];
    const sinceTs = since ? Date.parse(since) : null;

    return {
      jobs: postings
        .filter((job) => {
          if (!sinceTs) return true;
          const createdTs = Date.parse(toIso(job.createdAt));
          return !Number.isNaN(createdTs) && createdTs >= sinceTs;
        })
        .map((job) => {
          const createdAt = toIso(job.createdAt);
          const location = job.categories?.location || "";
          const commitment = job.categories?.commitment || "";
          const team = job.categories?.team || "";
          const labels = [location, commitment, team].filter((entry) => entry.length > 0);
          const issueUrl = job.hostedUrl || job.applyUrl || `https://jobs.lever.co/${site}/${job.id}`;

          return {
            externalJobId: job.id,
            issueUrl,
            issueNumber: 0,
            title: job.text,
            body: [job.descriptionPlain || job.description || "", location ? `Location: ${location}` : null].filter(Boolean).join("\n\n"),
            labels,
            createdAt,
            updatedAt: createdAt,
            posterUsername: "lever",
            posterAvatarUrl: null,
            commentsCount: 0,
            applyUrl: job.applyUrl || job.hostedUrl || null,
          };
        }),
      httpStatus: res.status,
      latencyMs: Date.now() - started,
    };
  },
};
