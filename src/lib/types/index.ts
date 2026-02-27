// Core types for GitJobs v2

export interface JobListing {
  id: string;
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
  sourceId: string | null;
  sourceType: SourceType;
  externalJobId: string | null;
  // Parsed fields
  company: string | null;
  role: string | null;
  salary: string | null;
  location: string | null;
  contractType: ContractType | null;
  experienceLevel: ExperienceLevel | null;
  techStack: string[];
  benefits: string | null;
  applyUrl: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  contactWhatsapp: string | null;
  isRemote: boolean;
  // Matching
  matchScore: number | null;
  matchExplain?: MatchExplain;
  source?: JobSourceMeta | null;
  // Outreach
  outreachStatus: OutreachStatus;
}

export type ContractType = "CLT" | "PJ" | "Freela" | "Internship" | "Unknown";
export type SourceType = "github_repo" | "greenhouse_board" | "lever_postings";
export type ExperienceLevel =
  | "Junior"
  | "Pleno"
  | "Senior"
  | "Lead"
  | "Intern"
  | "Unknown";

export type OutreachStatus =
  | "none"
  | "interested"
  | "email_drafted"
  | "email_sent"
  | "followed_up"
  | "replied"
  | "interviewing"
  | "rejected"
  | "accepted";

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  skills: string[];
  experienceYears: number;
  experienceLevel: ExperienceLevel;
  preferredContractTypes: ContractType[];
  preferredLocations: string[];
  preferRemote: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  bio: string | null;
  highlights: string[];
  profileScore: number;
  profileScoreBand: "low" | "medium" | "high";
  profileScoreMissing: string[];
  profileScoreSuggestions: string[];
  profileScoreUpdatedAt: string | null;
}

export interface OutreachRecord {
  id: string;
  userId: string;
  jobId: string;
  status: OutreachStatus;
  emailSubject: string | null;
  emailBody: string | null;
  sentAt: string | null;
  followedUpAt: string | null;
  repliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepoSource {
  id: string;
  sourceType: SourceType;
  displayName: string | null;
  owner: string;
  repo: string;
  externalKey: string | null;
  fullName: string;
  url: string;
  category: string;
  technology: string | null;
  attributionLabel: string | null;
  attributionUrl: string | null;
  termsUrl: string | null;
  termsAcceptedAt: string | null;
  enabled: boolean;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  healthBreakdownJson: string;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  syncIntervalMinutes: number;
  nextSyncAt: string | null;
  autoDiscovered: boolean;
  discoveryConfidence: number;
  regionTagsJson: string;
  throttledUntil: string | null;
  lastScrapedAt: string | null;
  totalJobsFetched: number;
}

export interface ScrapeRun {
  id: string;
  repoFullName: string;
  startedAt: string;
  completedAt: string | null;
  newJobsFound: number;
  totalIssuesFetched: number;
  status: "running" | "completed" | "failed";
  error: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  newJobsToday: number;
  newJobsThisWeek: number;
  totalReposMonitored: number;
  totalOutreachSent: number;
  totalReplies: number;
  totalInterviews: number;
  topTechnologies: { name: string; count: number }[];
  jobsByContractType: { type: string; count: number }[];
  jobsByExperienceLevel: { level: string; count: number }[];
}

export interface JobSourceMeta {
  id: string;
  type: SourceType;
  displayName: string;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  attributionLabel: string | null;
  attributionUrl: string | null;
}

export interface MatchBreakdown {
  skills: number;
  remote: number;
  contract: number;
  level: number;
  location: number;
}

export interface MatchExplain {
  reasons: string[];
  missingSkills: string[];
  breakdown: MatchBreakdown;
}
