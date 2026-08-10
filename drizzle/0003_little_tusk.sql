CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`alert_frequency` text DEFAULT 'off' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_saved_searches_owner_name` ON `saved_searches` (`owner_key`,`name`);--> statement-breakpoint
CREATE INDEX `idx_saved_searches_owner_updated_at` ON `saved_searches` (`owner_key`,`updated_at`);