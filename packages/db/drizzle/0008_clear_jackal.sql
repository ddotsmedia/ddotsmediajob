CREATE TABLE "career_tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50),
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"icon" varchar(10),
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gcc_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50),
	"name" varchar(100),
	"flag" varchar(10),
	"currency" varchar(10),
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "gcc_countries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gcc_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"country" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "whatsapp_apply_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cv_apply_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "walk_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "walk_in_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "walk_in_time" varchar(50);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "walk_in_venue" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "walk_in_last_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "apply_whatsapp" varchar(30);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "gcc_country" varchar(50) DEFAULT 'uae';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "source_country" varchar(50);--> statement-breakpoint
CREATE INDEX "gcc_waitlist_country_idx" ON "gcc_waitlist" USING btree ("country");