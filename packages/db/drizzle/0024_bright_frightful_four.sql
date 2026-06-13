ALTER TABLE "company_reviews" ADD COLUMN "culture_rating" integer;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "salary_rating" integer;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "management_rating" integer;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "worklife_rating" integer;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "advice" text;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "would_recommend" boolean;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "is_anonymous" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "employer_response" text;