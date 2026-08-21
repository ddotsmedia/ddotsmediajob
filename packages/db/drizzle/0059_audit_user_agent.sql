ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_logs" USING btree ("entity");