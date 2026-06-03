PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `prediction`;
--> statement-breakpoint
DROP TABLE IF EXISTS `match`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tournament` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `external_source` text,
  `season` text,
  `starts_at` integer,
  `ends_at` integer,
  `raw_payload` text,
  `last_synced_at` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tournament_slug_unique` ON `tournament` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tournament_external_unique` ON `tournament` (`external_source`,`season`);
--> statement-breakpoint
ALTER TABLE `pool` ADD `tournament_id` text REFERENCES `tournament`(`id`) ON DELETE set null;
--> statement-breakpoint
CREATE TABLE `match` (
  `id` text PRIMARY KEY NOT NULL,
  `tournament_id` text NOT NULL REFERENCES `tournament`(`id`) ON DELETE cascade,
  `home_team` text NOT NULL,
  `away_team` text NOT NULL,
  `starts_at` integer NOT NULL,
  `external_source` text,
  `external_id` text,
  `season` text,
  `stage` text,
  `group_name` text,
  `matchday` integer,
  `home_team_external_id` text,
  `away_team_external_id` text,
  `home_team_label` text,
  `away_team_label` text,
  `home_team_emoji` text,
  `away_team_emoji` text,
  `stadium_external_id` text,
  `stadium_name` text,
  `stadium_city` text,
  `home_score` integer,
  `away_score` integer,
  `finished` integer,
  `time_elapsed` text,
  `raw_payload` text,
  `last_synced_at` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_tournament_external_unique` ON `match` (`tournament_id`,`external_source`,`external_id`);
--> statement-breakpoint
CREATE TABLE `prediction` (
  `id` text PRIMARY KEY NOT NULL,
  `pool_id` text NOT NULL REFERENCES `pool`(`id`) ON DELETE cascade,
  `match_id` text NOT NULL REFERENCES `match`(`id`) ON DELETE cascade,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `pool_user_id` text REFERENCES `pool_user`(`id`) ON DELETE set null,
  `home_goals` integer,
  `away_goals` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prediction_pool_match_user_unique` ON `prediction` (`pool_id`,`match_id`,`user_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
