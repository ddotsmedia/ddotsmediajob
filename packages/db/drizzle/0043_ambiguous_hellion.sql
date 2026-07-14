CREATE TABLE IF NOT EXISTS "cv_view_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"profile_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_view_logs" ADD CONSTRAINT "cv_view_logs_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_view_logs" ADD CONSTRAINT "cv_view_logs_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cv_view_employer_idx" ON "cv_view_logs" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cv_view_profile_idx" ON "cv_view_logs" USING btree ("profile_user_id");