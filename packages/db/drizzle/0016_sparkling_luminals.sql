CREATE TABLE "video_interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"job_id" uuid,
	"title" varchar(200) NOT NULL,
	"questions" jsonb NOT NULL,
	"share_token" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"applicant_name" varchar(160) NOT NULL,
	"applicant_email" varchar(255),
	"answers" jsonb NOT NULL,
	"ai_score" integer,
	"ai_sentiment" varchar(40),
	"ai_transcript" text,
	"ai_summary" text,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_responses" ADD CONSTRAINT "video_responses_interview_id_video_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."video_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vi_token_idx" ON "video_interviews" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "vi_employer_idx" ON "video_interviews" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "vr_interview_idx" ON "video_responses" USING btree ("interview_id");