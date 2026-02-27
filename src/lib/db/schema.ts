import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";

// ─── Global tables (not per-user) ──────────────────────────

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  issueUrl: text("issue_url").notNull().unique(),
  issueNumber: integer("issue_number").notNull(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  labels: text("labels").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  posterUsername: text("poster_username").notNull(),
  posterAvatarUrl: text("poster_avatar_url"),
  commentsCount: integer("comments_count").notNull().default(0),
  company: text("company"),
  role: text("role"),
  salary: text("salary"),
  location: text("location"),
  contractType: text("contract_type"),
  experienceLevel: text("experience_level"),
  techStack: text("tech_stack").notNull().default("[]"),
  benefits: text("benefits"),
  applyUrl: text("apply_url"),
  contactEmail: text("contact_email"),
  contactLinkedin: text("contact_linkedin"),
  contactWhatsapp: text("contact_whatsapp"),
  isRemote: integer("is_remote", { mode: "boolean" }).notNull().default(false),
  // DEPRECATED: use jobMatchScores for per-user scores. Kept for migration compat.
  matchScore: real("match_score"),
  matchScoreCalculatedAt: text("match_score_calculated_at"),
  // DEPRECATED: use outreachRecords.status per-user. Kept for migration compat.
  outreachStatus: text("outreach_status").notNull().default("none"),
  fetchedAt: text("fetched_at").notNull(),
  parsedAt: text("parsed_at"),
});

export const repoSources = sqliteTable("repo_sources", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  fullName: text("full_name").notNull().unique(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  technology: text("technology"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastScrapedAt: text("last_scraped_at"),
  totalJobsFetched: integer("total_jobs_fetched").notNull().default(0),
});

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: text("id").primaryKey(),
  repoFullName: text("repo_full_name").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  newJobsFound: integer("new_jobs_found").notNull().default(0),
  totalIssuesFetched: integer("total_issues_fetched").notNull().default(0),
  status: text("status").notNull().default("running"),
  error: text("error"),
});

// ─── Auth tables (NextAuth) ────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  image: text("image"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  tokenType: text("token_type"),
  sessionState: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// ─── Per-user tables ───────────────────────────────────────

/** User profile — now per-user (userId is the PK, NOT 'default') */
export const userProfile = sqliteTable("user_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  resumeUrl: text("resume_url"),
  skills: text("skills").notNull().default("[]"),
  experienceYears: integer("experience_years").notNull().default(0),
  experienceLevel: text("experience_level").notNull().default("Pleno"),
  preferredContractTypes: text("preferred_contract_types").notNull().default('["CLT","PJ"]'),
  preferredLocations: text("preferred_locations").notNull().default("[]"),
  preferRemote: integer("prefer_remote", { mode: "boolean" }).notNull().default(true),
  minSalary: real("min_salary"),
  maxSalary: real("max_salary"),
  bio: text("bio"),
  highlights: text("highlights").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

/** Outreach records — now per-user */
export const outreachRecords = sqliteTable("outreach_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  jobId: text("job_id").notNull().references(() => jobs.id),
  status: text("status").notNull().default("none"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  sentAt: text("sent_at"),
  followedUpAt: text("followed_up_at"),
  repliedAt: text("replied_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  unique("outreach_user_job").on(table.userId, table.jobId),
]);

export const connectedEmailAccounts = sqliteTable("connected_email_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  emailAddress: text("email_address").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at"),
  scope: text("scope"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  company: text("company"),
  position: text("position"),
  source: text("source").default("manual"),
  sourceRef: text("source_ref"),
  status: text("status").default("lead"),
  notes: text("notes"),
  customFields: text("custom_fields"),
  lastContactedAt: text("last_contacted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const outboundEmails = sqliteTable("outbound_emails", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  accountId: text("account_id").notNull(),
  contactId: text("contact_id"),
  recipientEmail: text("recipient_email").notNull(),
  senderEmail: text("sender_email").notNull(),
  replyTo: text("reply_to"),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  status: text("status").notNull().default("queued"),
  provider: text("provider").notNull(),
  providerMessageId: text("provider_message_id"),
  providerThreadId: text("provider_thread_id"),
  sentAt: text("sent_at"),
  failedAt: text("failed_at"),
  createdAt: text("created_at").notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const conversationThreads = sqliteTable("conversation_threads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  accountId: text("account_id").notNull(),
  contactId: text("contact_id"),
  provider: text("provider").notNull(),
  providerThreadId: text("provider_thread_id"),
  subject: text("subject"),
  status: text("status").default("active"),
  lastMessageAt: text("last_message_at"),
  messageCount: integer("message_count").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Plan & Usage tables (new) ─────────────────────────────

/** User plan — free or pro */
export const userPlan = sqliteTable("user_plan", {
  userId: text("user_id").primaryKey().references(() => users.id),
  plan: text("plan").notNull().default("free"), // 'free' | 'pro'
  planStartedAt: text("plan_started_at").notNull(),
  planExpiresAt: text("plan_expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Monthly usage counters per user */
export const usageCounters = sqliteTable("usage_counters", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  periodStart: text("period_start").notNull(), // 'YYYY-MM-01'
  revealsUsed: integer("reveals_used").notNull().default(0),
  draftsUsed: integer("drafts_used").notNull().default(0),
  sendsUsed: integer("sends_used").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  unique("usage_user_period").on(table.userId, table.periodStart),
]);

/** Job reveals — tracks which jobs a user has revealed contact info for */
export const jobReveals = sqliteTable("job_reveals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  jobId: text("job_id").notNull().references(() => jobs.id),
  createdAt: text("created_at").notNull(),
}, (table) => [
  unique("reveal_user_job").on(table.userId, table.jobId),
]);

/** Per-user match scores (replaces global jobs.matchScore) */
export const jobMatchScores = sqliteTable("job_match_scores", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  jobId: text("job_id").notNull().references(() => jobs.id),
  score: real("score").notNull(),
  calculatedAt: text("calculated_at").notNull(),
}, (table) => [
  unique("match_user_job").on(table.userId, table.jobId),
]);

export const emailTemplates = sqliteTable("email_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  language: text("language").notNull(),
  subject: text("subject").notNull(),
  subjectVariants: text("subject_variants"),
  body: text("body").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
