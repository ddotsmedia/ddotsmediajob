CREATE TABLE "success_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seeker_name" varchar(160) NOT NULL,
	"role" varchar(160) NOT NULL,
	"company" varchar(160),
	"emirate" varchar(40),
	"story" text NOT NULL,
	"time_to_hire" varchar(60),
	"tips" text,
	"photo_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "success_published_idx" ON "success_stories" USING btree ("is_published");