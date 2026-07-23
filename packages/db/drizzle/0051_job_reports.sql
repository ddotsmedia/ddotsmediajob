CREATE TABLE "job_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" varchar(40) NOT NULL,
	"details" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"reporter_ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_reports_status_idx" ON "job_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_reports_job_idx" ON "job_reports" USING btree ("job_id");