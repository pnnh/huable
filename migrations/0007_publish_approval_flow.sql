-- Backfill approval_status before dropping is_public/is_published so that visibility
-- after migration matches visibility before migration (see research.md Decision 1).
UPDATE `channels` SET `approval_status` = 'draft' WHERE `is_public` = 0;--> statement-breakpoint
UPDATE `notes` SET `approval_status` = 'draft' WHERE `is_published` = 0 OR `channel_id` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`approval_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channels`("id", "user_id", "name", "description", "approval_status", "created_at") SELECT "id", "user_id", "name", "description", "approval_status", "created_at" FROM `channels`;--> statement-breakpoint
DROP TABLE `channels`;--> statement-breakpoint
ALTER TABLE `__new_channels` RENAME TO `channels`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`mime_type` text DEFAULT 'text/markdown' NOT NULL,
	`approval_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "user_id", "channel_id", "parent_id", "title", "body", "mime_type", "approval_status", "created_at", "updated_at") SELECT "id", "user_id", "channel_id", "parent_id", "title", "body", "mime_type", "approval_status", "created_at", "updated_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;