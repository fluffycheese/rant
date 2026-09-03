ALTER TABLE `cable_links` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `device_templates` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `devices` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ports` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `racks` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `is_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_protected` integer DEFAULT false NOT NULL;