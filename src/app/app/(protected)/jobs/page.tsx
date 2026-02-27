"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, LoadingButton, SkeletonList, useToast } from "@/components/ui";

interface Job {
  id: string;
  issueUrl: string;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  repoFullName: string;
  company: string | null;
  salary: string | null;
  location: string | null;
  contractType: string | null;
  experienceLevel: string | null;
  techStack: string[];
  isRemote: boolean;
  applyUrl: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  matchScore: number | null;
  outreachStatus: string;
  isRevealed: boolean;
  hasContact: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function JobsPage() {
  const router = useRouter();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    remote: "",
    contractType: "",
    level: "",
    role: "",
    outreachStatus: "",
    contactType: "",
    minMatchScore: "",
    sort: "matchScore",
  });
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [draftingJob, setDraftingJob] = useState<string | null>(null);
  const [revealingJob, setRevealingJob] = useState<string | null>(null);
  const [revealBlocked, setRevealBlocked] = useState(false);

  const fetchJobs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sort: filters.sort,
      });
      if (search) params.set("search", search);
      if (filters.remote) params.set("remote", filters.remote);
      if (filters.contractType) params.set("contractType", filters.contractType);
      if (filters.level) params.set("level", filters.level);
      if (filters.role) params.set("role", filters.role);
      if (filters.outreachStatus) params.set("outreachStatus", filters.outreachStatus);
      if (filters.contactType) params.set("contactType", filters.contactType);
      if (filters.minMatchScore) params.set("minMatchScore", filters.minMatchScore);

      try {
        const res = await fetch(`/api/jobs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [search, filters]
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDraftEmail = async (jobId: string) => {
    setDraftingJob(jobId);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, language: "pt-BR" }),
      });

      const data = await res.json();
      if (res.status === 402 && data?.error === "upgrade_required") {
        toast.error("Draft limit reached. Upgrade to Pro in Settings.");
        router.push("/app/settings");
        return;
      }

      if (data.success) {
        toast.success("Email draft created! Check Outreach.");
        fetchJobs(pagination.page);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch {
      toast.error("Failed to create draft");
    } finally {
      setDraftingJob(null);
    }
  };

  const handleReveal = async (jobId: string) => {
    if (revealBlocked) {
      router.push("/app/settings");
      return;
    }

    setRevealingJob(jobId);
    try {
      const res = await fetch("/api/jobs/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();

      if (res.status === 402 && data?.error === "upgrade_required") {
        setRevealBlocked(true);
        toast.error("Reveal limit reached. Upgrade to Pro in Settings.");
        return;
      }

      if (data.success) {
        toast.success("Contact revealed");
        fetchJobs(pagination.page);
      } else {
        toast.error(data.error || "Failed to reveal contact");
      }
    } catch {
      toast.error("Failed to reveal contact");
    } finally {
      setRevealingJob(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <p className="text-sm text-zinc-500 mt-1">{pagination.total} jobs found across all repos</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search jobs, companies, tech..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
          className="flex-1 min-w-[240px] px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={filters.remote}
          onChange={(e) => setFilters({ ...filters, remote: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">All Locations</option>
          <option value="true">Remote Only</option>
        </select>
        <select
          value={filters.contractType}
          onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">All Contracts</option>
          <option value="CLT">CLT</option>
          <option value="PJ">PJ</option>
          <option value="Freela">Freela</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">All Levels</option>
          <option value="Junior">Junior</option>
          <option value="Pleno">Pleno</option>
          <option value="Senior">Senior</option>
          <option value="Lead">Lead</option>
        </select>
        <select
          value={filters.outreachStatus}
          onChange={(e) => setFilters({ ...filters, outreachStatus: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="">All Outreach</option>
          <option value="none">Not Contacted</option>
          <option value="email_drafted">Drafted</option>
          <option value="email_sent">Sent</option>
          <option value="followed_up">Followed Up</option>
          <option value="replied">Replied</option>
          <option value="interviewing">Interviewing</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="matchScore">Best Match</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="comments">Most Comments</option>
        </select>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : error ? (
        <div className="bg-zinc-900 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <LoadingButton onClick={() => fetchJobs()} loading={false}>
            Try Again
          </LoadingButton>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs found" message="Try scraping repos first or adjust your filters." />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={job.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-zinc-100 hover:text-emerald-400 truncate"
                      >
                        {job.title}
                      </a>
                      {job.isRemote && (
                        <span className="shrink-0 px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">
                          Remote
                        </span>
                      )}
                      {!job.hasContact && job.applyUrl && (
                        <span className="shrink-0 px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded-full">
                          ATS Only
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                      {job.company && <span className="text-zinc-300">{job.company}</span>}
                      <span>{job.repoFullName}</span>
                      {job.salary && <span className="text-emerald-400">{job.salary}</span>}
                      {job.location && <span>{job.location}</span>}
                      {job.contractType && <span className="px-1.5 py-0.5 text-xs bg-zinc-800 rounded">{job.contractType}</span>}
                      {job.experienceLevel && <span className="px-1.5 py-0.5 text-xs bg-zinc-800 rounded">{job.experienceLevel}</span>}
                      <span className="text-xs">{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                    {job.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.techStack.slice(0, 8).map((tech) => (
                          <span key={tech} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {job.matchScore !== null && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          job.matchScore >= 70
                            ? "bg-emerald-500/10 text-emerald-400"
                            : job.matchScore >= 40
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {job.matchScore}%
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Expand"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={expandedJob === job.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                        />
                      </svg>
                    </button>

                    {!job.isRevealed && job.hasContact && (
                      <button
                        onClick={() => handleReveal(job.id)}
                        disabled={revealingJob === job.id}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          revealBlocked
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-cyan-600 hover:bg-cyan-700 text-white"
                        }`}
                      >
                        {revealingJob === job.id ? "..." : revealBlocked ? "Upgrade to reveal" : "Reveal contact"}
                      </button>
                    )}

                    {job.outreachStatus === "none" && job.isRevealed && job.contactEmail && (
                      <button
                        onClick={() => handleDraftEmail(job.id)}
                        disabled={draftingJob === job.id}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {draftingJob === job.id ? "..." : "Draft Email"}
                      </button>
                    )}

                    {job.outreachStatus === "none" && !job.hasContact && job.applyUrl && (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                      >
                        Apply via ATS
                      </a>
                    )}

                    {job.outreachStatus !== "none" && (
                      <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded">
                        {job.outreachStatus.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {expandedJob === job.id && (
                <div className="border-t border-zinc-800 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {job.contactEmail && (
                      <div>
                        <span className="text-xs text-zinc-500">Email:</span>
                        <p className="text-sm text-zinc-300">{job.contactEmail}</p>
                      </div>
                    )}
                    {job.contactLinkedin && (
                      <div>
                        <span className="text-xs text-zinc-500">LinkedIn:</span>
                        <p className="text-sm text-blue-400">{job.contactLinkedin}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-zinc-950 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
                      {job.body.substring(0, 2000)}
                      {job.body.length > 2000 && "..."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => fetchJobs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-zinc-700"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchJobs(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
