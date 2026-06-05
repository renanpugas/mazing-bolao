ALTER TABLE `match` ADD `odds_api_match_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `match_odds_api_match_id_unique` ON `match` (`odds_api_match_id`);
