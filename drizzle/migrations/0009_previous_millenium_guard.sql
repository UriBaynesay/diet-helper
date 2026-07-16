ALTER TABLE "unit_conversions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingest_runs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "unit_conversions" CASCADE;--> statement-breakpoint
DROP TABLE "ingest_runs" CASCADE;--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_external_id_unique";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "source" SET DEFAULT 'manual'::text;--> statement-breakpoint
DROP TYPE "public"."product_source";--> statement-breakpoint
CREATE TYPE "public"."product_source" AS ENUM('manual', 'image');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."product_source";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "source" SET DATA TYPE "public"."product_source" USING "source"::"public"."product_source";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "quantity_g" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "source_name";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "source_url";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "external_id";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "raw_text";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "parsed_quantity";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "parsed_unit";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "parsed_name";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "match_confidence";--> statement-breakpoint
DROP TYPE "public"."recipe_source";--> statement-breakpoint
DROP TYPE "public"."recipe_status";--> statement-breakpoint
DROP TYPE "public"."match_confidence";--> statement-breakpoint
DROP TYPE "public"."ingest_run_status";