CREATE TABLE "copilot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"context_type" varchar(20) DEFAULT 'jobseeker' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "copilot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(12) NOT NULL,
	"content" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"model_used" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_conversation_id_copilot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."copilot_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_conv_user_idx" ON "copilot_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "copilot_msg_conv_idx" ON "copilot_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "copilot_msg_created_idx" ON "copilot_messages" USING btree ("created_at");