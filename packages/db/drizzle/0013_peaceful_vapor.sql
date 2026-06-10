CREATE TABLE "interview_scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"job_id" uuid,
	"candidate_name" varchar(160) NOT NULL,
	"items" jsonb NOT NULL,
	"weighted_total" real NOT NULL,
	"recommendation" varchar(40),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scorecard_employer_idx" ON "interview_scorecards" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "scorecard_job_idx" ON "interview_scorecards" USING btree ("job_id");