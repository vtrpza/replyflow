ALTER TABLE `user_profile` ADD `onboarding_status` text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `onboarding_completed_steps` text DEFAULT '[]' NOT NULL;