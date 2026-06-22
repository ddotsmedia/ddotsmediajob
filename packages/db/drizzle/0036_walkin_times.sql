ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_time_start" varchar(10);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_time_end" varchar(10);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_maps_url" text;
