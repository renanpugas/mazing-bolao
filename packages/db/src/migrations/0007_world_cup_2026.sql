ALTER TABLE `match` ADD `external_source` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `external_id` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `season` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `stage` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `group_name` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `matchday` integer;
--> statement-breakpoint
ALTER TABLE `match` ADD `home_team_external_id` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `away_team_external_id` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `home_team_label` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `away_team_label` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `home_team_emoji` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `away_team_emoji` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `stadium_external_id` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `stadium_name` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `stadium_city` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `home_score` integer;
--> statement-breakpoint
ALTER TABLE `match` ADD `away_score` integer;
--> statement-breakpoint
ALTER TABLE `match` ADD `finished` integer;
--> statement-breakpoint
ALTER TABLE `match` ADD `time_elapsed` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `raw_payload` text;
--> statement-breakpoint
ALTER TABLE `match` ADD `last_synced_at` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `match_pool_external_unique` ON `match` (`pool_id`,`external_source`,`external_id`);
--> statement-breakpoint

CREATE TABLE `team` (
  `id` text PRIMARY KEY NOT NULL,
  `external_source` text NOT NULL,
  `external_id` text NOT NULL,
  `name` text NOT NULL,
  `fifa_code` text,
  `iso2` text,
  `group_name` text,
  `emoji` text,
  `raw_payload` text,
  `last_synced_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_external_unique` ON `team` (`external_source`,`external_id`);
--> statement-breakpoint

CREATE TABLE `stadium` (
  `id` text PRIMARY KEY NOT NULL,
  `external_source` text NOT NULL,
  `external_id` text NOT NULL,
  `name` text NOT NULL,
  `fifa_name` text,
  `city` text,
  `country` text,
  `capacity` integer,
  `region` text,
  `raw_payload` text,
  `last_synced_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stadium_external_unique` ON `stadium` (`external_source`,`external_id`);
--> statement-breakpoint

CREATE TABLE `group_standing` (
  `id` text PRIMARY KEY NOT NULL,
  `external_source` text NOT NULL,
  `season` text NOT NULL,
  `group_name` text NOT NULL,
  `team_external_id` text NOT NULL,
  `played` integer DEFAULT 0 NOT NULL,
  `wins` integer DEFAULT 0 NOT NULL,
  `draws` integer DEFAULT 0 NOT NULL,
  `losses` integer DEFAULT 0 NOT NULL,
  `points` integer DEFAULT 0 NOT NULL,
  `goals_for` integer DEFAULT 0 NOT NULL,
  `goals_against` integer DEFAULT 0 NOT NULL,
  `goals_diff` integer DEFAULT 0 NOT NULL,
  `raw_payload` text,
  `last_synced_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_standing_external_unique` ON `group_standing` (`external_source`,`season`,`group_name`,`team_external_id`);
