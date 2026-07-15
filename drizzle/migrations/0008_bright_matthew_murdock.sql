CREATE TYPE "public"."ingest_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "unit_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit" text NOT NULL,
	"ingredient_pattern" text,
	"grams" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingest_run_status" DEFAULT 'running' NOT NULL,
	"recipes_found" integer DEFAULT 0 NOT NULL,
	"recipes_created" integer DEFAULT 0 NOT NULL,
	"recipes_skipped" integer DEFAULT 0 NOT NULL,
	"error" text
);
