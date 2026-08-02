ALTER TABLE `notes` ADD `parent_id` text REFERENCES notes(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `notes` ADD `mime_type` text DEFAULT 'text/markdown' NOT NULL;
