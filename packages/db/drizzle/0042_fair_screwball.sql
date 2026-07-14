ALTER TABLE "jobseeker_profiles" ADD COLUMN IF NOT EXISTS "work_experience" jsonb;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN IF NOT EXISTS "education" jsonb;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN IF NOT EXISTS "profile_completed_at" timestamp with time zone;