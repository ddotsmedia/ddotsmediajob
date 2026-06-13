ALTER TABLE "skill_assessments" ADD COLUMN "employer_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_assessments" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_employer_idx" ON "skill_assessments" USING btree ("employer_id");