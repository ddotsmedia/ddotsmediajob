CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percent" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "feature_flags" ("key", "name", "enabled", "rollout_percent") VALUES
  ('ai_copilot', 'AI Copilot', false, 0),
  ('salary_intelligence', 'Salary Intelligence', false, 0),
  ('job_matching_v2', 'Job Matching v2', false, 0),
  ('employer_ats', 'Employer ATS', false, 0),
  ('interview_scheduling', 'Interview Scheduling', false, 0),
  ('learning_paths', 'Learning Paths', false, 0)
ON CONFLICT ("key") DO NOTHING;
