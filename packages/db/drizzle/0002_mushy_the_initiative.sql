ALTER TABLE "jobs" ADD COLUMN "free_zone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "free_zone_name" varchar(40);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "visa_provided" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "accommodation_provided" boolean DEFAULT false NOT NULL;