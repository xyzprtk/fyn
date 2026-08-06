DROP INDEX `tx_account_date_idx`;--> statement-breakpoint
CREATE INDEX `tx_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `tx_account_date_id_idx` ON `transactions` (`account_id`,`date`,`id`);--> statement-breakpoint
CREATE INDEX `tx_account_category_date_idx` ON `transactions` (`account_id`,`category`,`date`);