CREATE TABLE "application_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"stage_id" varchar(40) NOT NULL,
	"moved_by" uuid,
	"notes" text,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"offer_id" uuid,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candidate_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" uuid,
	"content" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"job_id" uuid,
	"metric" varchar(60) NOT NULL,
	"value" real DEFAULT 0 NOT NULL,
	"period" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"stages" jsonb DEFAULT '[{"id":"new","name":"New","order":0},{"id":"screened","name":"Screened","order":1},{"id":"phone","name":"Phone Interview","order":2},{"id":"test","name":"Skills Test","order":3},{"id":"interview","name":"Final Interview","order":4},{"id":"offer","name":"Offer","order":5},{"id":"hired","name":"Hired","order":6}]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"confirmed_at" timestamp with time zone,
	"reminder_sent_24h" boolean DEFAULT false NOT NULL,
	"reminder_sent_1h" boolean DEFAULT false NOT NULL,
	"calendar_invite_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"employer_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"booked" boolean DEFAULT false NOT NULL,
	"application_id" uuid,
	"zoom_link" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"job_id" uuid,
	"employer_id" uuid NOT NULL,
	"candidate_id" uuid,
	"salary" integer,
	"currency" varchar(8) DEFAULT 'AED' NOT NULL,
	"start_date" date,
	"probation_months" integer DEFAULT 6 NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text,
	"token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"decline_reason" text,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referencecheck_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"referee_name" varchar(160) NOT NULL,
	"referee_email" varchar(255),
	"referee_phone" varchar(40),
	"referee_relation" varchar(120),
	"token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"answers" jsonb,
	"ai_summary" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scorecard_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"interviewer_id" uuid,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_score" integer,
	"recommendation" varchar(30),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"employer_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"competencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills_assessments_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid,
	"application_id" uuid,
	"candidate_id" uuid,
	"job_id" uuid,
	"score" integer,
	"passed" boolean DEFAULT false NOT NULL,
	"answers" jsonb,
	"time_taken" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"follow_up_date" date,
	"added_from_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_offer_id_offer_letters_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_analytics" ADD CONSTRAINT "hiring_analytics_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_analytics" ADD CONSTRAINT "hiring_analytics_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_pipelines" ADD CONSTRAINT "hiring_pipelines_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_bookings" ADD CONSTRAINT "interview_bookings_slot_id_interview_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."interview_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_bookings" ADD CONSTRAINT "interview_bookings_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_slots" ADD CONSTRAINT "interview_slots_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_slots" ADD CONSTRAINT "interview_slots_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_slots" ADD CONSTRAINT "interview_slots_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referencecheck_requests" ADD CONSTRAINT "referencecheck_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_results" ADD CONSTRAINT "scorecard_results_scorecard_id_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_results" ADD CONSTRAINT "scorecard_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_results" ADD CONSTRAINT "scorecard_results_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_assessments_results" ADD CONSTRAINT "skills_assessments_results_assessment_id_skill_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."skill_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_assessments_results" ADD CONSTRAINT "skills_assessments_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_assessments_results" ADD CONSTRAINT "skills_assessments_results_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_assessments_results" ADD CONSTRAINT "skills_assessments_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_pool" ADD CONSTRAINT "talent_pool_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_pool" ADD CONSTRAINT "talent_pool_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_pool" ADD CONSTRAINT "talent_pool_added_from_job_id_jobs_id_fk" FOREIGN KEY ("added_from_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appstage_app_idx" ON "application_stages" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "appstage_job_idx" ON "application_stages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "approval_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_requestedby_idx" ON "approval_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "cnote_app_idx" ON "candidate_notes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "hanalytics_employer_idx" ON "hiring_analytics" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "hanalytics_metric_idx" ON "hiring_analytics" USING btree ("metric");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_job_idx" ON "hiring_pipelines" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "booking_slot_idx" ON "interview_bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "slot_employer_idx" ON "interview_slots" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "slot_job_idx" ON "interview_slots" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_token_idx" ON "offer_letters" USING btree ("token");--> statement-breakpoint
CREATE INDEX "offer_employer_idx" ON "offer_letters" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "offer_app_idx" ON "offer_letters" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refcheck_token_idx" ON "referencecheck_requests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refcheck_app_idx" ON "referencecheck_requests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "scresult_app_idx" ON "scorecard_results" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "scresult_card_idx" ON "scorecard_results" USING btree ("scorecard_id");--> statement-breakpoint
CREATE INDEX "sc_employer_idx" ON "scorecards" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "sc_job_idx" ON "scorecards" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "sar_app_idx" ON "skills_assessments_results" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "sar_job_idx" ON "skills_assessments_results" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_unique_idx" ON "talent_pool" USING btree ("employer_id","candidate_id");--> statement-breakpoint
CREATE INDEX "talent_employer_idx" ON "talent_pool" USING btree ("employer_id");