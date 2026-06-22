ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_last_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_contact_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_required_docs" text;
