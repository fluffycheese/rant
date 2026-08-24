CREATE TABLE `cable_links` (
	`id` text PRIMARY KEY NOT NULL,
	`port_a_id` text NOT NULL,
	`port_a_slot` text DEFAULT 'primary' NOT NULL,
	`port_b_id` text NOT NULL,
	`port_b_slot` text DEFAULT 'primary' NOT NULL,
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
CREATE UNIQUE INDEX `uq_link_port_a_slot` ON `cable_links` (`port_a_id`,`port_a_slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_link_port_b_slot` ON `cable_links` (`port_b_id`,`port_b_slot`);--> statement-breakpoint
CREATE TABLE `device_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`manufacturer` text,
	`model` text,
	`port_count` integer NOT NULL,
	`port_layout` text NOT NULL,
	`u_height` integer DEFAULT 1 NOT NULL,
	`color` text DEFAULT '#4a9eff' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`rack_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`position_u` integer,
	`canvas_x` real DEFAULT 0 NOT NULL,
	`canvas_y` real DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#4a9eff' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`rack_id`) REFERENCES `racks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `device_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `ports` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`label` text NOT NULL,
	`connector_type` text DEFAULT 'rj45' NOT NULL,
	`position` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `racks` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`u_height` integer DEFAULT 42 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
