ALTER TABLE "jobs" ADD COLUMN "source" varchar(16) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "contact_whatsapp" varchar(30);