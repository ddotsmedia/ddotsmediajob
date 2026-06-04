CREATE TABLE "job_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"employer_id" uuid,
	"is_global" boolean DEFAULT false NOT NULL,
	"category_slug" varchar(40) NOT NULL,
	"job_type" "job_type" NOT NULL,
	"emirate_slug" varchar(40),
	"salary_min" integer,
	"salary_max" integer,
	"description" text NOT NULL,
	"requirements" text,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visa_provided" boolean DEFAULT false NOT NULL,
	"accommodation_provided" boolean DEFAULT false NOT NULL,
	"freshers_welcome" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "title_ar" varchar(160) DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "description_ar" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "requirements_ar" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "benefits_ar" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "templates_employer_idx" ON "job_templates" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "templates_global_idx" ON "job_templates" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "job_templates" USING btree ("category_slug");