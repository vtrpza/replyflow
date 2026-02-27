CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`scope` text,
	`id_token` text,
	`token_type` text,
	`session_state` text
);
--> statement-breakpoint
CREATE TABLE `connected_email_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email_address` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`scope` text,
	`is_default` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`company` text,
	`position` text,
	`source` text DEFAULT 'manual',
	`source_ref` text,
	`status` text DEFAULT 'lead',
	`notes` text,
	`custom_fields` text,
	`last_contacted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`contact_id` text,
	`provider` text NOT NULL,
	`provider_thread_id` text,
	`subject` text,
	`status` text DEFAULT 'active',
	`last_message_at` text,
	`message_count` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`language` text NOT NULL,
	`subject` text NOT NULL,
	`subject_variants` text,
	`body` text NOT NULL,
	`is_default` integer DEFAULT false,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_match_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`score` real NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_user_job` ON `job_match_scores` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `job_reveals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reveal_user_job` ON `job_reveals` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_url` text NOT NULL,
	`issue_number` integer NOT NULL,
	`repo_owner` text NOT NULL,
	`repo_name` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`poster_username` text NOT NULL,
	`poster_avatar_url` text,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`company` text,
	`role` text,
	`salary` text,
	`location` text,
	`contract_type` text,
	`experience_level` text,
	`tech_stack` text DEFAULT '[]' NOT NULL,
	`benefits` text,
	`apply_url` text,
	`contact_email` text,
	`contact_linkedin` text,
	`contact_whatsapp` text,
	`is_remote` integer DEFAULT false NOT NULL,
	`match_score` real,
	`match_score_calculated_at` text,
	`outreach_status` text DEFAULT 'none' NOT NULL,
	`fetched_at` text NOT NULL,
	`parsed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_issue_url_unique` ON `jobs` (`issue_url`);--> statement-breakpoint
CREATE TABLE `outbound_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`contact_id` text,
	`recipient_email` text NOT NULL,
	`sender_email` text NOT NULL,
	`reply_to` text,
	`subject` text NOT NULL,
	`body_html` text,
	`body_text` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider` text NOT NULL,
	`provider_message_id` text,
	`provider_thread_id` text,
	`sent_at` text,
	`failed_at` text,
	`created_at` text NOT NULL,
	`error_code` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `outreach_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'none' NOT NULL,
	`email_subject` text,
	`email_body` text,
	`sent_at` text,
	`followed_up_at` text,
	`replied_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outreach_user_job` ON `outreach_records` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `repo_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`full_name` text NOT NULL,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`technology` text,
	`enabled` integer DEFAULT true NOT NULL,
	`last_scraped_at` text,
	`total_jobs_fetched` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_sources_full_name_unique` ON `repo_sources` (`full_name`);--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_full_name` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`new_jobs_found` integer DEFAULT 0 NOT NULL,
	`total_issues_fetched` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_start` text NOT NULL,
	`reveals_used` integer DEFAULT 0 NOT NULL,
	`drafts_used` integer DEFAULT 0 NOT NULL,
	`sends_used` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_user_period` ON `usage_counters` (`user_id`,`period_start`);--> statement-breakpoint
CREATE TABLE `user_plan` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`plan_started_at` text NOT NULL,
	`plan_expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text,
	`linkedin_url` text,
	`github_url` text,
	`portfolio_url` text,
	`resume_url` text,
	`skills` text DEFAULT '[]' NOT NULL,
	`experience_years` integer DEFAULT 0 NOT NULL,
	`experience_level` text DEFAULT 'Pleno' NOT NULL,
	`preferred_contract_types` text DEFAULT '["CLT","PJ"]' NOT NULL,
	`preferred_locations` text DEFAULT '[]' NOT NULL,
	`prefer_remote` integer DEFAULT true NOT NULL,
	`min_salary` real,
	`max_salary` real,
	`bio` text,
	`highlights` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profile_user_id_unique` ON `user_profile` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
