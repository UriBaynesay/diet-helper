CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."product_source" AS ENUM('manual', 'image', 'ingested');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"serving_label" text,
	"serving_size_g" numeric,
	"kcal_per_100g" numeric NOT NULL,
	"protein_per_100g" numeric NOT NULL,
	"carbs_per_100g" numeric NOT NULL,
	"fat_per_100g" numeric NOT NULL,
	"fiber_per_100g" numeric,
	"sugar_per_100g" numeric,
	"sodium_mg_per_100g" numeric,
	"source" "product_source" DEFAULT 'manual' NOT NULL,
	"image_path" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);