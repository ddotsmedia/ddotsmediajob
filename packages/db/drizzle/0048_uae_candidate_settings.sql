ALTER TABLE "users" ADD COLUMN "visa_sponsorship_needed" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_locations" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "salary_expectations_aed" integer[];