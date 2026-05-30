ALTER TABLE `prediction` ADD `pool_user_id` text REFERENCES `pool_user`(`id`) ON UPDATE no action ON DELETE set null;
