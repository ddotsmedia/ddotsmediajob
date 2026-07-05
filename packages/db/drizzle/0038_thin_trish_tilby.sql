ALTER TABLE "job_alerts" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_alerts" ADD COLUMN IF NOT EXISTS "email" varchar(255);--> statement-breakpoint
ALTER TABLE "job_alerts" ADD COLUMN IF NOT EXISTS "token" varchar(64);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_time_start" varchar(10);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_time_end" varchar(10);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_maps_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_contact_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "walk_in_required_docs" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_alerts_email_idx" ON "job_alerts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_alerts_token_idx" ON "job_alerts" USING btree ("token");
