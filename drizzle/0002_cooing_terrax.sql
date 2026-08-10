CREATE TABLE `tender_workflow` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`tender_id` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`stage` text DEFAULT 'none' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`external_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tender_workflow_owner_tender` ON `tender_workflow` (`owner_key`,`tender_id`);--> statement-breakpoint
CREATE INDEX `idx_tender_workflow_owner_stage` ON `tender_workflow` (`owner_key`,`stage`);