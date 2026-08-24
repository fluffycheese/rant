PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cable_links` (
	`id` text PRIMARY KEY NOT NULL,
	`port_a_id` text NOT NULL,
	`port_a_slot` text DEFAULT 'front' NOT NULL,
	`port_b_id` text NOT NULL,
	`port_b_slot` text DEFAULT 'front' NOT NULL,
	`cable_type` text DEFAULT 'cat6' NOT NULL,
	`color` text,
	`label` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`port_a_id`) REFERENCES `ports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`port_b_id`) REFERENCES `ports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cable_links`("id", "port_a_id", "port_a_slot", "port_b_id", "port_b_slot", "cable_type", "color", "label", "notes", "created_at", "updated_at") SELECT "id", "port_a_id", "port_a_slot", "port_b_id", "port_b_slot", "cable_type", "color", "label", "notes", "created_at", "updated_at" FROM `cable_links`;--> statement-breakpoint
DROP TABLE `cable_links`;--> statement-breakpoint
ALTER TABLE `__new_cable_links` RENAME TO `cable_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_link_port_a_slot` ON `cable_links` (`port_a_id`,`port_a_slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_link_port_b_slot` ON `cable_links` (`port_b_id`,`port_b_slot`);