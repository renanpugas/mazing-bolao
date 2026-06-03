ALTER TABLE `pool` ADD `created_by_user_id` text REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
UPDATE `pool`
SET `created_by_user_id` = (
  SELECT `pool_user`.`user_id`
  FROM `pool_user`
  WHERE `pool_user`.`pool_id` = `pool`.`id`
  ORDER BY `pool_user`.`created_at` ASC
  LIMIT 1
)
WHERE `created_by_user_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `pool_question` (
  `id` text PRIMARY KEY NOT NULL,
  `pool_id` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `question` text NOT NULL,
  `points` integer NOT NULL,
  `closes_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pool_question_answer` (
  `id` text PRIMARY KEY NOT NULL,
  `question_id` text NOT NULL,
  `pool_id` text NOT NULL,
  `user_id` text NOT NULL,
  `pool_user_id` text,
  `answer` text NOT NULL,
  `is_correct` integer,
  `reviewed_by_user_id` text,
  `reviewed_at` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`question_id`) REFERENCES `pool_question`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`pool_id`) REFERENCES `pool`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`pool_user_id`) REFERENCES `pool_user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pool_question_answer_question_user_unique` ON `pool_question_answer` (`question_id`,`user_id`);
