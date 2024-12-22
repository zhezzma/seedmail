CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`received_at` text NOT NULL,
	`spf_status` text NOT NULL,
	`dmarc_status` text NOT NULL,
	`dkim_status` text NOT NULL,
	`headers` text NOT NULL,
	`size` integer NOT NULL,
	`raw_email` text NOT NULL,
	`type` text DEFAULT 'received' NOT NULL,
	`starred` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);