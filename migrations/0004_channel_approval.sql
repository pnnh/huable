ALTER TABLE `channels` ADD `approval_status` text NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `approval_events` ADD `type` text NOT NULL DEFAULT 'note';
--> statement-breakpoint
ALTER TABLE `approval_events` ADD `channel_id` text REFERENCES `channels`(`id`) ON DELETE cascade;
--> statement-breakpoint
-- Make note_id nullable by recreating the table
CREATE TABLE `approval_events_new` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL DEFAULT 'note',
	`note_id` text REFERENCES `notes`(`id`) ON DELETE cascade,
	`channel_id` text REFERENCES `channels`(`id`) ON DELETE cascade,
	`action` text NOT NULL,
	`is_handled` integer NOT NULL DEFAULT false,
	`handled_at` integer,
	`handled_by` text REFERENCES `users`(`id`) ON DELETE set null,
	`result` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `approval_events_new` SELECT `id`, `type`, `note_id`, `channel_id`, `action`, `is_handled`, `handled_at`, `handled_by`, `result`, `created_at` FROM `approval_events`;
--> statement-breakpoint
DROP TABLE `approval_events`;
--> statement-breakpoint
ALTER TABLE `approval_events_new` RENAME TO `approval_events`;
