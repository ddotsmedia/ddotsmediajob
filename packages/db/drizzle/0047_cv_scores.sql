CREATE TABLE "cv_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"job_description_hash" varchar(64) NOT NULL,
	"keyword_match_pct" integer DEFAULT 0 NOT NULL,
	"experience_match_pct" integer DEFAULT 0 NOT NULL,
	"combined_score" integer DEFAULT 0 NOT NULL,
	"matched_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_scores" ADD CONSTRAINT "cv_scores_cv_id_users_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cv_scores_cv_job_idx" ON "cv_scores" USING btree ("cv_id","job_description_hash");