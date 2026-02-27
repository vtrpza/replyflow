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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
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
INSERT INTO `__new_accounts`("id", "user_id", "type", "provider", "provider_account_id", "refresh_token", "access_token", "expires_at", "scope", "id_token", "token_type", "session_state") SELECT "id", "user_id", "type", "provider", "provider_account_id", "refresh_token", "access_token", "expires_at", "scope", "id_token", "token_type", "session_state" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_connected_email_accounts` (
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
INSERT INTO `__new_connected_email_accounts`("id", "user_id", "provider", "provider_account_id", "email_address", "access_token", "refresh_token", "expires_at", "scope", "is_default", "created_at", "updated_at") SELECT "id", "user_id", "provider", "provider_account_id", "email_address", "access_token", "refresh_token", "expires_at", "scope", "is_default", "created_at", "updated_at" FROM `connected_email_accounts`;--> statement-breakpoint
DROP TABLE `connected_email_accounts`;--> statement-breakpoint
ALTER TABLE `__new_connected_email_accounts` RENAME TO `connected_email_accounts`;--> statement-breakpoint
CREATE TABLE `__new_contacts` (
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
INSERT INTO `__new_contacts`("id", "user_id", "email", "name", "company", "position", "source", "source_ref", "status", "notes", "custom_fields", "last_contacted_at", "created_at", "updated_at") SELECT "id", "user_id", "email", "name", "company", "position", "source", "source_ref", "status", "notes", "custom_fields", "last_contacted_at", "created_at", "updated_at" FROM `contacts`;--> statement-breakpoint
DROP TABLE `contacts`;--> statement-breakpoint
ALTER TABLE `__new_contacts` RENAME TO `contacts`;--> statement-breakpoint
CREATE TABLE `__new_conversation_threads` (
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
INSERT INTO `__new_conversation_threads`("id", "user_id", "account_id", "contact_id", "provider", "provider_thread_id", "subject", "status", "last_message_at", "message_count", "created_at", "updated_at") SELECT "id", "user_id", "account_id", "contact_id", "provider", "provider_thread_id", "subject", "status", "last_message_at", "message_count", "created_at", "updated_at" FROM `conversation_threads`;--> statement-breakpoint
DROP TABLE `conversation_threads`;--> statement-breakpoint
ALTER TABLE `__new_conversation_threads` RENAME TO `conversation_threads`;--> statement-breakpoint
CREATE TABLE `__new_outbound_emails` (
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
INSERT INTO `__new_outbound_emails`("id", "user_id", "account_id", "contact_id", "recipient_email", "sender_email", "reply_to", "subject", "body_html", "body_text", "status", "provider", "provider_message_id", "provider_thread_id", "sent_at", "failed_at", "created_at", "error_code", "error_message") SELECT "id", "user_id", "account_id", "contact_id", "recipient_email", "sender_email", "reply_to", "subject", "body_html", "body_text", "status", "provider", "provider_message_id", "provider_thread_id", "sent_at", "failed_at", "created_at", "error_code", "error_message" FROM `outbound_emails`;--> statement-breakpoint
DROP TABLE `outbound_emails`;--> statement-breakpoint
ALTER TABLE `__new_outbound_emails` RENAME TO `outbound_emails`;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("session_token", "user_id", "expires") SELECT "session_token", "user_id", "expires" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE TABLE `__new_user_profile` (
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
INSERT INTO `__new_user_profile`("id", "user_id", "name", "email", "phone", "linkedin_url", "github_url", "portfolio_url", "resume_url", "skills", "experience_years", "experience_level", "preferred_contract_types", "preferred_locations", "prefer_remote", "min_salary", "max_salary", "bio", "highlights", "updated_at") SELECT "id", "user_id", "name", "email", "phone", "linkedin_url", "github_url", "portfolio_url", "resume_url", "skills", "experience_years", "experience_level", "preferred_contract_types", "preferred_locations", "prefer_remote", "min_salary", "max_salary", "bio", "highlights", "updated_at" FROM `user_profile`;--> statement-breakpoint
DROP TABLE `user_profile`;--> statement-breakpoint
ALTER TABLE `__new_user_profile` RENAME TO `user_profile`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_profile_user_id_unique` ON `user_profile` (`user_id`);--> statement-breakpoint
ALTER TABLE `outreach_records` ADD `user_id` text NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE UNIQUE INDEX `outreach_user_job` ON `outreach_records` (`user_id`,`job_id`);