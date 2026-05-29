CREATE TABLE `match` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`starts_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade
);
