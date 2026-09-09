-- Explicit and intentional, ahead of the CASCADE drops below (which would
-- drop it implicitly as a side effect of dropping "recipes" — dropping it
-- by name here instead keeps that removal visible in migration history
-- rather than an implicit side effect). recipe_nutrition is replaced
-- entirely by the meal model's in-application-code nutrition sum
-- (macrosForQuantity), not by a new view.
DROP VIEW "recipe_nutrition";--> statement-breakpoint
ALTER TABLE "recipes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "recipes" CASCADE;--> statement-breakpoint
DROP TABLE "recipe_ingredients" CASCADE;--> statement-breakpoint
ALTER TABLE "diary_entries" DROP CONSTRAINT "diary_entries_exactly_one_source";--> statement-breakpoint
-- diary_entries_recipe_id_recipes_id_fk is already gone here — dropped
-- implicitly by the "recipes" CASCADE above, since it referenced recipes.id.
ALTER TABLE "diary_entries" DROP COLUMN "recipe_id";--> statement-breakpoint
ALTER TABLE "diary_entries" DROP COLUMN "servings";