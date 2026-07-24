CREATE TYPE "public"."company_verification_tier" AS ENUM('unverified', 'pending', 'basic', 'enhanced', 'pro');--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "verification_tier" "company_verification_tier" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "verification_status" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "company_legal_name" varchar(200);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "company_registration_number" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "company_website_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "companies_verification_tier_idx" ON "companies" USING btree ("verification_tier");--> statement-breakpoint
-- Backfill tier from the retained is_verified flag (verified companies -> basic).
UPDATE "companies" SET "verification_tier" = 'basic' WHERE "is_verified" = true;
