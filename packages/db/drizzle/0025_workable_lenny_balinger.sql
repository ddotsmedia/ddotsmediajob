ALTER TYPE "public"."user_role" ADD VALUE 'volunteer';--> statement-breakpoint
CREATE TABLE "community_event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"group_id" uuid,
	"category_slug" varchar(40),
	"title" varchar(200) NOT NULL,
	"description" text,
	"host_id" uuid,
	"event_type" varchar(40),
	"zoom_link" varchar(500),
	"scheduled_at" timestamp with time zone,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_attendees" integer,
	"status" varchar(20) DEFAULT 'upcoming' NOT NULL,
	"recording_url" varchar(500),
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_qa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"category_slug" varchar(40),
	"user_id" uuid,
	"question" text NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"answer_count" integer DEFAULT 0 NOT NULL,
	"is_answered" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_qa_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"user_id" uuid,
	"answer" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"is_accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_job_blasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"blaster_id" uuid,
	"message" text,
	"blast_type" varchar(30) DEFAULT 'manual' NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_success_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"user_id" uuid,
	"group_id" uuid,
	"title" varchar(200) NOT NULL,
	"story" text NOT NULL,
	"photo" varchar(500),
	"job_title" varchar(160),
	"company" varchar(160),
	"emirate" varchar(40),
	"weeks_to_hire" integer,
	"tips" text,
	"approved" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"professions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emirates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text,
	"available_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"available_times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_mentees_per_month" integer DEFAULT 3 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentee_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"topic" varchar(120),
	"message" text,
	"preferred_time" varchar(120),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"zoom_link" varchar(500),
	"notes" text,
	"rating" integer,
	"rating_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"total_conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_id" uuid,
	"referral_code" varchar(20) NOT NULL,
	"source" varchar(40),
	"group_id" uuid,
	"converted" boolean DEFAULT false NOT NULL,
	"conversion_type" varchar(40),
	"reward_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "salary_poll_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_option" varchar(120) NOT NULL,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_slug" varchar(40),
	"emirate" varchar(40),
	"question" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scam_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text,
	"risk_score" integer,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(60),
	"reporter_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid,
	"month" date,
	"jobs_shared" integer DEFAULT 0 NOT NULL,
	"members_referred" integer DEFAULT 0 NOT NULL,
	"hires_tracked" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "slug" varchar(120);--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "jobs_shared_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "hires_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "weekly_activity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "cover_image" varchar(500);--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "group_description" text;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "pinned_message" text;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "volunteer_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "last_blasted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "badge_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "badge_most_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD COLUMN "badge_fastest_hiring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "community_event_rsvps" ADD CONSTRAINT "community_event_rsvps_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_event_rsvps" ADD CONSTRAINT "community_event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_qa" ADD CONSTRAINT "community_qa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_qa_answers" ADD CONSTRAINT "community_qa_answers_question_id_community_qa_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."community_qa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_qa_answers" ADD CONSTRAINT "community_qa_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_job_blasts" ADD CONSTRAINT "group_job_blasts_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_job_blasts" ADD CONSTRAINT "group_job_blasts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_job_blasts" ADD CONSTRAINT "group_job_blasts_blaster_id_users_id_fk" FOREIGN KEY ("blaster_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_success_stories" ADD CONSTRAINT "group_success_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_success_stories" ADD CONSTRAINT "group_success_stories_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentee_id_users_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_poll_responses" ADD CONSTRAINT "salary_poll_responses_poll_id_salary_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."salary_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_poll_responses" ADD CONSTRAINT "salary_poll_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scam_reports" ADD CONSTRAINT "scam_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_stats" ADD CONSTRAINT "volunteer_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_stats" ADD CONSTRAINT "volunteer_stats_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_unique_idx" ON "community_event_rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cevent_slug_idx" ON "community_events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cevent_status_idx" ON "community_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "qa_slug_idx" ON "community_qa" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "qa_category_idx" ON "community_qa" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "qaans_question_idx" ON "community_qa_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "blast_group_idx" ON "group_job_blasts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "blast_job_idx" ON "group_job_blasts" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gstory_slug_idx" ON "group_success_stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "gstory_group_idx" ON "group_success_stories" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_user_idx" ON "mentor_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mreq_mentor_idx" ON "mentor_requests" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "mreq_mentee_idx" ON "mentor_requests" USING btree ("mentee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refcode_code_idx" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "refcode_user_idx" ON "referral_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "referral_referrer_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_code_idx" ON "referrals" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "pollresp_unique_idx" ON "salary_poll_responses" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_category_idx" ON "salary_polls" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "scam_status_idx" ON "scam_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vstats_user_idx" ON "volunteer_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vstats_group_idx" ON "volunteer_stats" USING btree ("group_id");--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wa_slug_idx" ON "whatsapp_groups" USING btree ("slug");