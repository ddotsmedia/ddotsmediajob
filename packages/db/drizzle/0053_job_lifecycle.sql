ALTER TYPE "public"."job_status" ADD VALUE 'paused';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'archived';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "filled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "archived_at" timestamp with time zone;