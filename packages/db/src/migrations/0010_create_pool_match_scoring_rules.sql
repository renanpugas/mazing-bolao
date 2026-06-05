CREATE TABLE `pool_match_scoring_rule` (
  `id` text PRIMARY KEY NOT NULL,
  `pool_id` text NOT NULL,
  `stage` text NOT NULL,
  `exact_score_points` integer NOT NULL,
  `outcome_points` integer NOT NULL,
  `brazil_multiplier` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pool_match_scoring_rule_pool_stage_unique` ON `pool_match_scoring_rule` (`pool_id`,`stage`);
