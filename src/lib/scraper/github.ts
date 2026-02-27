/**
 * GitHub Issues Scraper
 * Fetches job listings from Brazilian dev community repos where jobs are posted as GitHub Issues.
 */

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  comments: number;
}

interface ScrapedJob {
  issueUrl: string;
  issueNumber: number;
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  posterUsername: string;
  posterAvatarUrl: string;
  commentsCount: number;
}

export class GitHubScraper {
  private token: string | null;
  private baseUrl = "https://api.github.com";

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || null;
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitJobs-v2-Scraper",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    // Check rate limit
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining && parseInt(remaining) < 10) {
      const resetTime = response.headers.get("x-ratelimit-reset");
      console.warn(
        `GitHub API rate limit low: ${remaining} remaining. Resets at ${resetTime ? new Date(parseInt(resetTime) * 1000).toISOString() : "unknown"}`
      );
    }

    return response;
  }

  /**
   * Fetch all open issues (job postings) from a repo.
   * Handles pagination automatically.
   */
  async fetchIssues(
    owner: string,
    repo: string,
    since?: string
  ): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      let url = `${this.baseUrl}/repos/${owner}/${repo}/issues?state=open&per_page=${perPage}&page=${page}&sort=created&direction=desc`;
      if (since) {
        url += `&since=${since}`;
      }

      const response = await this.fetchWithAuth(url);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `GitHub API error for ${owner}/${repo}: ${response.status} - ${error}`
        );
      }

      const issues: GitHubIssue[] = await response.json();

      // Filter out pull requests (GitHub API returns PRs in issues endpoint too)
      const jobIssues = issues.filter(
        (issue) => !("pull_request" in issue)
      );

      for (const issue of jobIssues) {
        allJobs.push({
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          repoOwner: owner,
          repoName: repo,
          repoFullName: `${owner}/${repo}`,
          title: issue.title,
          body: issue.body || "",
          labels: issue.labels.map((l) => l.name),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          posterUsername: issue.user.login,
          posterAvatarUrl: issue.user.avatar_url,
          commentsCount: issue.comments,
        });
      }

      // Check if there are more pages
      if (issues.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }

      // Small delay to be respectful of rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return allJobs;
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<{
    remaining: number;
    limit: number;
    resetAt: string;
  }> {
    const response = await this.fetchWithAuth(
      `${this.baseUrl}/rate_limit`
    );
    const data = await response.json();
    return {
      remaining: data.rate.remaining,
      limit: data.rate.limit,
      resetAt: new Date(data.rate.reset * 1000).toISOString(),
    };
  }
}

export type { ScrapedJob, GitHubIssue };
