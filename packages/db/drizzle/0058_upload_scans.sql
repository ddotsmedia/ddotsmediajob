CREATE TYPE "public"."upload_scan_status" AS ENUM('pending', 'clean', 'suspicious', 'quarantined');--> statement-breakpoint
CREATE TABLE "upload_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(512) NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"scan_status" "upload_scan_status" DEFAULT 'pending' NOT NULL,
	"scan_result" jsonb,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "upload_scans" ADD CONSTRAINT "upload_scans_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_scans_uploaded_by_idx" ON "upload_scans" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "upload_scans_status_idx" ON "upload_scans" USING btree ("scan_status");--> statement-breakpoint
CREATE INDEX "upload_scans_created_idx" ON "upload_scans" USING btree ("created_at");