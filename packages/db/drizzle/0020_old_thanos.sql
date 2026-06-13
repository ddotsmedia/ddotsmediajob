CREATE TABLE "ama_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"question" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"answered" boolean DEFAULT false NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ama_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"expert_name" varchar(160) NOT NULL,
	"expert_title" varchar(200),
	"expert_company" varchar(160),
	"expert_photo" text,
	"topic" varchar(240) NOT NULL,
	"description" text,
	"scheduled_at" timestamp with time zone,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"recording_url" text,
	"summary" text,
	"status" varchar(20) DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seeker_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"course_id" varchar(120) NOT NULL,
	"provider" varchar(120),
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "culture_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" varchar(20) NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seeker_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seeker_id" uuid NOT NULL,
	"credential_type" varchar(80) NOT NULL,
	"issuer" varchar(200) NOT NULL,
	"title" varchar(200),
	"year" varchar(10),
	"file_url" text,
	"verification_hash" varchar(64),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "office_photos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "culture_video" varchar(500);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "ceo_message" text;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "ceo_name" varchar(120);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "ceo_photo" text;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "culture_description" text;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "benefits" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "working_hours" varchar(120);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "team_size" varchar(60);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "founded" varchar(20);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "company_type" varchar(40);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "linkedin" varchar(300);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "instagram" varchar(300);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "glassdoor_url" varchar(300);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "tour_image_url" text;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "culture_profile_ai" jsonb;--> statement-breakpoint
ALTER TABLE "ama_questions" ADD CONSTRAINT "ama_questions_session_id_ama_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ama_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ama_questions" ADD CONSTRAINT "ama_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_followers" ADD CONSTRAINT "company_followers_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_followers" ADD CONSTRAINT "company_followers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_clicks" ADD CONSTRAINT "course_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "culture_profiles" ADD CONSTRAINT "culture_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_credentials" ADD CONSTRAINT "seeker_credentials_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_credentials" ADD CONSTRAINT "seeker_credentials_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ama_q_session_idx" ON "ama_questions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ama_slug_idx" ON "ama_sessions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ama_status_idx" ON "ama_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_follow_unique_idx" ON "company_followers" USING btree ("seeker_id","company_id");--> statement-breakpoint
CREATE INDEX "company_follow_company_idx" ON "company_followers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "course_click_course_idx" ON "course_clicks" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "culture_user_idx" ON "culture_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cred_seeker_idx" ON "seeker_credentials" USING btree ("seeker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cred_hash_idx" ON "seeker_credentials" USING btree ("verification_hash");--> statement-breakpoint
CREATE INDEX "cred_status_idx" ON "seeker_credentials" USING btree ("status");