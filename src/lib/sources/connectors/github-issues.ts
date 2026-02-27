import { GitHubScraper } from "@/lib/scraper/github";
import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

export const githubIssuesConnector: SourceConnector = {
  type: "github_repo",
  ...SOURCE_POLICY.github_repo,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const scraper = new GitHubScraper();
    const started = Date.now();
    const issues = await scraper.fetchIssues(source.owner, source.repo, since);

    return {
      jobs: issues.map((issue) => ({
        externalJobId: String(issue.issueNumber),
        issueUrl: issue.issueUrl,
        issueNumber: issue.issueNumber,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        posterUsername: issue.posterUsername,
        posterAvatarUrl: issue.posterAvatarUrl,
        commentsCount: issue.commentsCount,
        applyUrl: null,
      })),
      httpStatus: null,
      latencyMs: Date.now() - started,
    };
  },
};
