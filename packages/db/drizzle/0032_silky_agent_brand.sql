CREATE TABLE "job_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"name_ar" varchar(120),
	"icon" varchar(60),
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"job_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_categories_slug_idx" ON "job_categories" USING btree ("slug");--> statement-breakpoint
-- Seed the existing 12 categories (idempotent on slug).
INSERT INTO "job_categories" ("slug","name","icon","sort_order") VALUES
  ('it','IT & Software','Laptop',0),
  ('healthcare','Healthcare','Stethoscope',1),
  ('finance','Finance & Accounting','Landmark',2),
  ('sales','Sales & Marketing','TrendingUp',3),
  ('construction','Construction','HardHat',4),
  ('hospitality','Hospitality & Tourism','ConciergeBell',5),
  ('driving','Driving & Logistics','Truck',6),
  ('education','Education','GraduationCap',7),
  ('admin','Admin & Office','Briefcase',8),
  ('manufacturing','Manufacturing','Factory',9),
  ('security','Security','ShieldCheck',10),
  ('beauty','Beauty & Wellness','Sparkles',11)
ON CONFLICT ("slug") DO NOTHING;
