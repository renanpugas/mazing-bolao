CREATE TABLE `pool_odd_bonus_rule` (
  `id` text PRIMARY KEY NOT NULL,
  `pool_id` text NOT NULL,
  `odd_threshold` real NOT NULL,
  `bonus_percent` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pool_odd_bonus_rule_pool_threshold_unique` ON `pool_odd_bonus_rule` (`pool_id`,`odd_threshold`);
