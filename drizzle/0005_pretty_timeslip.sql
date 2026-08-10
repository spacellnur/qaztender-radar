CREATE TABLE `tender_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tender_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`assigned_user_id` text,
	`due_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by_owner_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`external_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tender_tasks_tender_title` ON `tender_tasks` (`tender_id`,`title`);--> statement-breakpoint
CREATE INDEX `idx_tender_tasks_tender_sort` ON `tender_tasks` (`tender_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_tender_tasks_assignee_status` ON `tender_tasks` (`assigned_user_id`,`status`);