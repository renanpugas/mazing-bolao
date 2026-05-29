CREATE TABLE `prediction` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`home_goals` integer,
	`away_goals` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `match`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prediction_pool_match_user_unique` ON `prediction` (`pool_id`,`match_id`,`user_id`);
