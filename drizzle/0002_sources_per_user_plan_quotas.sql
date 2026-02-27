INSERT INTO `users` (`id`, `name`, `email`, `image`, `created_at`, `updated_at`)
SELECT 'system-migration', 'System Migration', 'system-migration@local.invalid', NULL, datetime('now'), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM `users`);
--> statement-breakpoint

CREATE TABLE `repo_source_migration_map` (
  `old_id` text PRIMARY KEY NOT NULL,
  `full_name` text NOT NULL
);
--> statement-breakpoint

INSERT INTO `repo_source_migration_map` (`old_id`, `full_name`)
SELECT `id`, `full_name` FROM `repo_sources`;
--> statement-breakpoint

CREATE TABLE `repo_sources_new` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `source_type` text NOT NULL DEFAULT 'github_repo',
  `display_name` text,
  `owner` text NOT NULL,
  `repo` text NOT NULL,
  `external_key` text,
  `full_name` text NOT NULL,
  `url` text NOT NULL,
  `category` text NOT NULL,
  `technology` text,
  `attribution_label` text,
  `attribution_url` text,
  `terms_url` text,
  `terms_accepted_at` text,
  `enabled` integer NOT NULL DEFAULT 1,
  `health_score` real NOT NULL DEFAULT 100,
  `health_status` text NOT NULL DEFAULT 'healthy',
  `health_breakdown_json` text NOT NULL DEFAULT '{}',
  `consecutive_failures` integer NOT NULL DEFAULT 0,
  `last_success_at` text,
  `last_error_at` text,
  `last_error_code` text,
  `last_error_message` text,
  `sync_interval_minutes` integer NOT NULL DEFAULT 30,
  `next_sync_at` text,
  `auto_discovered` integer NOT NULL DEFAULT 0,
  `discovery_confidence` real NOT NULL DEFAULT 0,
  `region_tags_json` text NOT NULL DEFAULT '[]',
  `throttled_until` text,
  `last_scraped_at` text,
  `total_jobs_fetched` integer NOT NULL DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

WITH ranked_users AS (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at`, `id`) AS `rn`
  FROM `users`
)
INSERT INTO `repo_sources_new` (
  `id`,
  `user_id`,
  `source_type`,
  `display_name`,
  `owner`,
  `repo`,
  `external_key`,
  `full_name`,
  `url`,
  `category`,
  `technology`,
  `attribution_label`,
  `attribution_url`,
  `terms_url`,
  `terms_accepted_at`,
  `enabled`,
  `health_score`,
  `health_status`,
  `health_breakdown_json`,
  `consecutive_failures`,
  `last_success_at`,
  `last_error_at`,
  `last_error_code`,
  `last_error_message`,
  `sync_interval_minutes`,
  `next_sync_at`,
  `auto_discovered`,
  `discovery_confidence`,
  `region_tags_json`,
  `throttled_until`,
  `last_scraped_at`,
  `total_jobs_fetched`
)
SELECT
  CASE
    WHEN ranked_users.rn = 1 THEN rs.`id`
    ELSE ranked_users.`id` || '__' || rs.`id`
  END AS `id`,
  ranked_users.`id` AS `user_id`,
  rs.`source_type`,
  rs.`display_name`,
  rs.`owner`,
  rs.`repo`,
  rs.`external_key`,
  rs.`full_name`,
  rs.`url`,
  rs.`category`,
  rs.`technology`,
  rs.`attribution_label`,
  rs.`attribution_url`,
  rs.`terms_url`,
  rs.`terms_accepted_at`,
  rs.`enabled`,
  rs.`health_score`,
  rs.`health_status`,
  rs.`health_breakdown_json`,
  rs.`consecutive_failures`,
  rs.`last_success_at`,
  rs.`last_error_at`,
  rs.`last_error_code`,
  rs.`last_error_message`,
  rs.`sync_interval_minutes`,
  rs.`next_sync_at`,
  rs.`auto_discovered`,
  rs.`discovery_confidence`,
  rs.`region_tags_json`,
  rs.`throttled_until`,
  rs.`last_scraped_at`,
  rs.`total_jobs_fetched`
FROM `repo_sources` rs
CROSS JOIN ranked_users;
--> statement-breakpoint

DROP TABLE `repo_sources`;
--> statement-breakpoint

ALTER TABLE `repo_sources_new` RENAME TO `repo_sources`;
--> statement-breakpoint

CREATE UNIQUE INDEX `repo_sources_user_full_name_unique` ON `repo_sources` (`user_id`, `full_name`);
--> statement-breakpoint
CREATE INDEX `idx_repo_sources_user_enabled` ON `repo_sources` (`user_id`, `enabled`);
--> statement-breakpoint
CREATE INDEX `idx_repo_sources_user_type_enabled` ON `repo_sources` (`user_id`, `source_type`, `enabled`);
--> statement-breakpoint

CREATE TABLE `source_job_links` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `source_id` text NOT NULL,
  `job_id` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`source_id`) REFERENCES `repo_sources`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_job_user_source_job_unique` ON `source_job_links` (`user_id`, `source_id`, `job_id`);
--> statement-breakpoint
CREATE INDEX `idx_source_job_links_user_job` ON `source_job_links` (`user_id`, `job_id`);
--> statement-breakpoint

INSERT OR IGNORE INTO `source_job_links` (`id`, `user_id`, `source_id`, `job_id`, `created_at`)
SELECT
  lower(hex(randomblob(16))),
  u.`id`,
  rs.`id`,
  j.`id`,
  datetime('now')
FROM `jobs` j
JOIN `repo_source_migration_map` m ON m.`old_id` = j.`source_id`
JOIN `users` u
JOIN `repo_sources` rs
  ON rs.`user_id` = u.`id`
 AND rs.`full_name` = m.`full_name`;
--> statement-breakpoint

DROP TABLE `repo_source_migration_map`;
--> statement-breakpoint

CREATE TABLE `source_usage_daily` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `feature` text NOT NULL,
  `day_start` text NOT NULL,
  `used` integer NOT NULL DEFAULT 0,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_usage_daily_user_feature_day_unique` ON `source_usage_daily` (`user_id`, `feature`, `day_start`);
