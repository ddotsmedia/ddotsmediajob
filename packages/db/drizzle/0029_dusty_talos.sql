CREATE TABLE "whapi_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_text_length" integer DEFAULT 30 NOT NULL,
	"require_salary" boolean DEFAULT false NOT NULL,
	"require_contact" boolean DEFAULT false NOT NULL,
	"require_location" boolean DEFAULT false NOT NULL,
	"allowed_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"block_own_messages" boolean DEFAULT true NOT NULL,
	"auto_publish" boolean DEFAULT false NOT NULL,
	"reply_on_success" boolean DEFAULT true NOT NULL,
	"reply_on_skip" boolean DEFAULT false NOT NULL,
	"success_message" text,
	"skip_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- seed one default config row
INSERT INTO "whapi_settings" DEFAULT VALUES;
