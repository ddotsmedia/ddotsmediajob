CREATE TABLE "cta_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"job_id" uuid NOT NULL,
	"cta_type" varchar(20) NOT NULL,
	"source_page" varchar(20),
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cta_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"job_id" uuid NOT NULL,
	"conversion_type" varchar(30) NOT NULL,
	"from_cta_type" varchar(20),
	"converted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cta_clicks" ADD CONSTRAINT "cta_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cta_clicks" ADD CONSTRAINT "cta_clicks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cta_conversions" ADD CONSTRAINT "cta_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cta_conversions" ADD CONSTRAINT "cta_conversions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cta_clicks_user_idx" ON "cta_clicks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cta_clicks_job_idx" ON "cta_clicks" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "cta_clicks_clicked_idx" ON "cta_clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "cta_conv_user_idx" ON "cta_conversions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cta_conv_job_idx" ON "cta_conversions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "cta_conv_converted_idx" ON "cta_conversions" USING btree ("converted_at");