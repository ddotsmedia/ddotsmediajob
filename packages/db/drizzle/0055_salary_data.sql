CREATE TABLE "salary_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_job_title" varchar(160) NOT NULL,
	"emirate" varchar(40) DEFAULT 'unknown' NOT NULL,
	"experience_level" varchar(20) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"median_aed" integer,
	"average_aed" integer,
	"min_aed" integer,
	"max_aed" integer,
	"percentile_25" integer,
	"percentile_75" integer,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_title" varchar(160) NOT NULL,
	"normalized_title" varchar(160) NOT NULL,
	"industry" varchar(120),
	"emirate" varchar(40),
	"city" varchar(80),
	"experience_level" varchar(20) NOT NULL,
	"education_level" varchar(20),
	"employment_type" varchar(20),
	"monthly_salary_aed" integer NOT NULL,
	"annual_salary_aed" integer,
	"currency" varchar(3) DEFAULT 'aed' NOT NULL,
	"benefits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_by_id" uuid,
	"data_source" varchar(20) DEFAULT 'jobseeker' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salary_submissions" ADD CONSTRAINT "salary_submissions_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "salary_agg_bucket_idx" ON "salary_aggregates" USING btree ("normalized_job_title","emirate","experience_level");--> statement-breakpoint
CREATE INDEX "salary_sub_emirate_idx" ON "salary_submissions" USING btree ("emirate");--> statement-breakpoint
CREATE INDEX "salary_sub_title_idx" ON "salary_submissions" USING btree ("normalized_title");--> statement-breakpoint
CREATE INDEX "salary_sub_exp_idx" ON "salary_submissions" USING btree ("experience_level");--> statement-breakpoint
CREATE INDEX "salary_sub_created_idx" ON "salary_submissions" USING btree ("created_at");