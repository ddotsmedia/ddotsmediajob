CREATE TABLE "saved_job_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(20) DEFAULT '#2a9aa4' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_job_folders" ADD CONSTRAINT "saved_job_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_folder_user_idx" ON "saved_job_folders" USING btree ("user_id");