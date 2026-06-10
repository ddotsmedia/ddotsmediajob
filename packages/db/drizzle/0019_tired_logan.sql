ALTER TABLE "jobs" ALTER COLUMN "source" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "source_metadata" jsonb;