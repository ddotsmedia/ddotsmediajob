ALTER TABLE "jobseeker_profiles" ADD COLUMN "username" varchar(50);--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "nationality" varchar(100);--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "languages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "availability_status" varchar(20) DEFAULT 'actively_looking' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "visibility" varchar(20) DEFAULT 'employers_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "open_to_relocate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "preferred_emirates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "preferred_job_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "preferred_categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "years_experience" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "expected_salary_min" integer;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "expected_salary_max" integer;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "show_salary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "show_whatsapp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD COLUMN "last_active" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "jobseeker_username_idx" ON "jobseeker_profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "jobseeker_visibility_idx" ON "jobseeker_profiles" USING btree ("visibility");--> statement-breakpoint
ALTER TABLE "jobseeker_profiles" ADD CONSTRAINT "jobseeker_profiles_username_unique" UNIQUE("username");