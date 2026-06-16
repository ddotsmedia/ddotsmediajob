ALTER TABLE "applications" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "response_hours" integer;