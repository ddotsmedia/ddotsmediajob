CREATE TABLE "assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"category_slug" varchar(40) NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"time_limit_sec" integer DEFAULT 60 NOT NULL,
	"pass_score" integer DEFAULT 70 NOT NULL,
	"badge_name" varchar(60) NOT NULL,
	"badge_color" varchar(20) DEFAULT '#2a9aa4' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_skill_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."skill_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "result_assessment_idx" ON "assessment_results" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "result_user_idx" ON "assessment_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "result_completed_idx" ON "assessment_results" USING btree ("completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_slug_idx" ON "skill_assessments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assessment_category_idx" ON "skill_assessments" USING btree ("category_slug");