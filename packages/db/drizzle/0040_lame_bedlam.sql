ALTER TABLE "jobseeker_profiles" ADD COLUMN IF NOT EXISTS "resume_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN IF NOT EXISTS "resume_uploaded_at" timestamp with time zone;
