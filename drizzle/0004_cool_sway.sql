CREATE TABLE `billing_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'asaas' NOT NULL,
	`provider_customer_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`cpf_cnpj` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_customers_user_id` ON `billing_customers` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_user_provider_unique` ON `billing_customers` (`user_id`,`provider`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_provider_customer_unique` ON `billing_customers` (`provider`,`provider_customer_id`);
--> statement-breakpoint

CREATE TABLE `billing_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'asaas' NOT NULL,
	`provider_subscription_id` text,
	`provider_customer_id` text NOT NULL,
	`provider_checkout_id` text,
	`plan_key` text DEFAULT 'pro_monthly' NOT NULL,
	`plan_price_cents` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`billing_type` text DEFAULT 'CREDIT_CARD' NOT NULL,
	`next_due_date` text,
	`current_period_end` text,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`cancelled_at` text,
	`raw_payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_subscriptions_user_status` ON `billing_subscriptions` (`user_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_billing_subscriptions_provider_checkout` ON `billing_subscriptions` (`provider`,`provider_checkout_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_subscriptions_provider_subscription_unique` ON `billing_subscriptions` (`provider`,`provider_subscription_id`);
--> statement-breakpoint

CREATE TABLE `billing_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'asaas' NOT NULL,
	`provider_payment_id` text NOT NULL,
	`provider_subscription_id` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text,
	`paid_at` text,
	`invoice_url` text,
	`payment_link` text,
	`raw_payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_payments_provider_subscription` ON `billing_payments` (`provider_subscription_id`);
--> statement-breakpoint
CREATE INDEX `idx_billing_payments_due_date` ON `billing_payments` (`due_date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payments_provider_payment_unique` ON `billing_payments` (`provider`,`provider_payment_id`);
--> statement-breakpoint

CREATE TABLE `billing_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'asaas' NOT NULL,
	`event_type` text NOT NULL,
	`provider_event_id` text,
	`payload_fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`processed_at` text,
	`processing_status` text DEFAULT 'received' NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_billing_webhook_events_created_at` ON `billing_webhook_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_billing_webhook_events_status` ON `billing_webhook_events` (`processing_status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_webhook_events_provider_event_unique` ON `billing_webhook_events` (`provider`,`provider_event_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_webhook_events_provider_fingerprint_unique` ON `billing_webhook_events` (`provider`,`payload_fingerprint`);
