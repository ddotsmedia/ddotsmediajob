DROP INDEX "applications_job_seeker_idx";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "seeker_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "guest_name" varchar(160);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "guest_email" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "guest_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "fraud_score" integer;--> statement-breakpoint
CREATE INDEX "applications_job_idx" ON "applications" USING btree ("job_id");