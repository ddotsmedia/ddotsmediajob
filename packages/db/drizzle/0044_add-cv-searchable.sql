ALTER TABLE "users" ADD COLUMN "cv_searchable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cv_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_cv_searchable" ON "users" USING btree ("cv_searchable") WHERE "users"."cv_searchable" = true;