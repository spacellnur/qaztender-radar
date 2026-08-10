CREATE TABLE `tender_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`tender_id` text NOT NULL,
	`action` text NOT NULL,
	`title` text NOT NULL,
	`changed_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`external_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tender_changes_tender_changed_at` ON `tender_changes` (`tender_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `tender_documents` (
	`external_id` text PRIMARY KEY NOT NULL,
	`tender_id` text NOT NULL,
	`lot_id` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`original_name` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`upstream_updated_at` text DEFAULT '' NOT NULL,
	`fetched_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`external_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tender_documents_tender_id` ON `tender_documents` (`tender_id`);--> statement-breakpoint
CREATE TABLE `tender_lots` (
	`external_id` text PRIMARY KEY NOT NULL,
	`tender_id` text NOT NULL,
	`lot_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status_name` text DEFAULT 'Не указан' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`enstru_ids` text DEFAULT '[]' NOT NULL,
	`delivery_kato` text DEFAULT '[]' NOT NULL,
	`upstream_updated_at` text DEFAULT '' NOT NULL,
	`fetched_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`external_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tender_lots_tender_id` ON `tender_lots` (`tender_id`);