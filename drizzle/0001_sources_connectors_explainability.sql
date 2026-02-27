ALTER TABLE `jobs` ADD COLUMN `source_id` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD COLUMN `source_type` text NOT NULL DEFAULT 'github_repo';
--> statement-breakpoint
ALTER TABLE `jobs` ADD COLUMN `external_job_id` text;
--> statement-breakpoint

ALTER TABLE `repo_sources` ADD COLUMN `source_type` text NOT NULL DEFAULT 'github_repo';
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `display_name` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `external_key` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `attribution_label` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `attribution_url` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `terms_url` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `terms_accepted_at` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `health_score` real NOT NULL DEFAULT 100;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `health_status` text NOT NULL DEFAULT 'healthy';
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `health_breakdown_json` text NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `consecutive_failures` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `last_success_at` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `last_error_at` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `last_error_code` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `last_error_message` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `sync_interval_minutes` integer NOT NULL DEFAULT 30;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `next_sync_at` text;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `auto_discovered` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `discovery_confidence` real NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `region_tags_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `repo_sources` ADD COLUMN `throttled_until` text;
--> statement-breakpoint

CREATE TABLE `source_sync_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL,
  `started_at` text NOT NULL,
  `completed_at` text,
  `status` text NOT NULL DEFAULT 'running',
  `http_status` integer,
  `latency_ms` integer,
  `total_fetched` integer NOT NULL DEFAULT 0,
  `new_jobs` integer NOT NULL DEFAULT 0,
  `duplicates` integer NOT NULL DEFAULT 0,
  `parse_success_ratio` real,
  `contact_yield_ratio` real,
  `error_code` text,
  `error_message` text
);
--> statement-breakpoint
CREATE INDEX `idx_source_sync_runs_source_started` ON `source_sync_runs` (`source_id`,`started_at`);
--> statement-breakpoint
CREATE INDEX `idx_source_sync_runs_status` ON `source_sync_runs` (`status`);
--> statement-breakpoint

ALTER TABLE `contacts` ADD COLUMN `first_seen_at` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `last_seen_at` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `jobs_count` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `last_job_id` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `last_job_title` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `last_company` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `last_source_type` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `source_history_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint

ALTER TABLE `job_match_scores` ADD COLUMN `reasons_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `job_match_scores` ADD COLUMN `missing_skills_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `job_match_scores` ADD COLUMN `breakdown_json` text NOT NULL DEFAULT '{}';
--> statement-breakpoint

ALTER TABLE `user_profile` ADD COLUMN `profile_score` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `user_profile` ADD COLUMN `profile_score_band` text NOT NULL DEFAULT 'low';
--> statement-breakpoint
ALTER TABLE `user_profile` ADD COLUMN `profile_score_missing` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `user_profile` ADD COLUMN `profile_score_suggestions` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `user_profile` ADD COLUMN `profile_score_updated_at` text;
--> statement-breakpoint

CREATE INDEX `idx_jobs_source_id` ON `jobs` (`source_id`);
--> statement-breakpoint
CREATE INDEX `idx_jobs_source_external` ON `jobs` (`source_type`,`external_job_id`);
