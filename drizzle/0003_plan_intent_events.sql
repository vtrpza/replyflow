CREATE TABLE `plan_intent_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `plan` text NOT NULL,
  `event_type` text NOT NULL,
  `feature` text,
  `route` text NOT NULL,
  `metadata_json` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plan_intent_events_created_at` ON `plan_intent_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_plan_intent_events_user_created_at` ON `plan_intent_events` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `idx_plan_intent_events_plan_type_created_at` ON `plan_intent_events` (`plan`, `event_type`, `created_at`);
