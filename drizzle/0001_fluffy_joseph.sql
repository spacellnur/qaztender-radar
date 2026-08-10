CREATE TABLE `tender_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`fetched_count` integer DEFAULT 0 NOT NULL,
	`saved_count` integer DEFAULT 0 NOT NULL,
	`error_message` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tender_sync_runs_started_at` ON `tender_sync_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `tenders` (
	`external_id` text PRIMARY KEY NOT NULL,
	`number_anno` text NOT NULL,
	`title` text NOT NULL,
	`buyer` text NOT NULL,
	`customer_bin` text DEFAULT '' NOT NULL,
	`region_code` text DEFAULT '' NOT NULL,
	`region_name` text DEFAULT 'Регион не указан' NOT NULL,
	`subject_type_id` integer DEFAULT 0 NOT NULL,
	`subject_type` text DEFAULT 'Не указан' NOT NULL,
	`method_id` integer DEFAULT 0 NOT NULL,
	`method_name` text DEFAULT 'Не указан' NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`publish_date` integer,
	`is_construction_work` integer DEFAULT false NOT NULL,
	`status_id` integer DEFAULT 0 NOT NULL,
	`status_name` text DEFAULT 'Не указан' NOT NULL,
	`kato` text DEFAULT '[]' NOT NULL,
	`system_id` integer DEFAULT 3 NOT NULL,
	`source_url` text NOT NULL,
	`upstream_updated_at` text DEFAULT '' NOT NULL,
	`fetched_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tenders_region_end_date` ON `tenders` (`region_code`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_tenders_end_date` ON `tenders` (`end_date`);--> statement-breakpoint
CREATE INDEX `idx_tenders_budget` ON `tenders` (`budget`);--> statement-breakpoint
CREATE INDEX `idx_tenders_upstream_updated_at` ON `tenders` (`upstream_updated_at`);