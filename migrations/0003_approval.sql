ALTER TABLE `notes` ADD `approval_status` text NOT NULL DEFAULT 'pending';
--> statement-breakpoint
CREATE TABLE `approval_events` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL REFERENCES `notes`(`id`) ON DELETE cascade,
	`action` text NOT NULL,
	`is_handled` integer NOT NULL DEFAULT false,
	`handled_at` integer,
	`handled_by` text REFERENCES `users`(`id`) ON DELETE set null,
	`result` text,
	`created_at` integer NOT NULL
);
