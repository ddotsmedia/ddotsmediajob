CREATE TABLE "security_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(60) NOT NULL,
	"user_id" uuid,
	"ip" varchar(64),
	"user_agent" varchar(400),
	"metadata" jsonb,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seclog_event_idx" ON "security_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "seclog_ip_idx" ON "security_logs" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "seclog_created_idx" ON "security_logs" USING btree ("created_at");