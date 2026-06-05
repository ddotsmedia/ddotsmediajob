CREATE TABLE "whatsapp_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(30) NOT NULL,
	"name" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_admins_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_bot_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(30),
	"direction" varchar(10),
	"message" text,
	"parsed_data" jsonb,
	"job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_bot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(30) NOT NULL,
	"state" varchar(50) DEFAULT 'idle' NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pending_field" varchar(50),
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_bot_sessions_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_bot_logs" ADD CONSTRAINT "whatsapp_bot_logs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wa_bot_logs_phone_idx" ON "whatsapp_bot_logs" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "wa_bot_logs_created_idx" ON "whatsapp_bot_logs" USING btree ("created_at");