CREATE TABLE "hiring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"emirate" varchar(40),
	"roles_text" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"meeting_url" text,
	"max_attendees" integer,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hiring_events" ADD CONSTRAINT "hiring_events_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_employer_idx" ON "hiring_events" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "event_starts_idx" ON "hiring_events" USING btree ("starts_at");