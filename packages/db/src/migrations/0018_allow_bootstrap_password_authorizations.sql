CREATE TABLE `__new_password_login_authorization` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `created_by_user_id` text,
  `used_by_user_id` text,
  `revoked_by_user_id` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `used_at` integer,
  `revoked_at` integer,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`revoked_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_password_login_authorization` (
  `id`,
  `email`,
  `created_by_user_id`,
  `used_by_user_id`,
  `revoked_by_user_id`,
  `created_at`,
  `used_at`,
  `revoked_at`
)
SELECT
  `id`,
  `email`,
  `created_by_user_id`,
  `used_by_user_id`,
  `revoked_by_user_id`,
  `created_at`,
  `used_at`,
  `revoked_at`
FROM `password_login_authorization`;
--> statement-breakpoint
DROP TABLE `password_login_authorization`;
--> statement-breakpoint
ALTER TABLE `__new_password_login_authorization` RENAME TO `password_login_authorization`;
--> statement-breakpoint
CREATE UNIQUE INDEX `password_login_authorization_email_unique` ON `password_login_authorization` (`email`);
--> statement-breakpoint
CREATE INDEX `password_login_authorization_created_by_user_id_idx` ON `password_login_authorization` (`created_by_user_id`);
--> statement-breakpoint
CREATE INDEX `password_login_authorization_used_by_user_id_idx` ON `password_login_authorization` (`used_by_user_id`);
--> statement-breakpoint
CREATE INDEX `password_login_authorization_revoked_by_user_id_idx` ON `password_login_authorization` (`revoked_by_user_id`);
