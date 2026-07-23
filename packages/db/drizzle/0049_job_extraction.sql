ALTER TABLE "jobs" ADD COLUMN "extracted_skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "extracted_years" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "extracted_locations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "extracted_salary_range" jsonb;