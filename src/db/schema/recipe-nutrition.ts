import { pgView, uuid, integer, numeric } from "drizzle-orm/pg-core";

// Maps the recipe_nutrition SQL view (created in a raw-SQL migration since
// it's derived, never a Drizzle-managed table). Do not write to this view.
export const recipeNutrition = pgView("recipe_nutrition", {
  recipeId: uuid("recipe_id"),
  servings: integer("servings"),
  kcalPerServing: numeric("kcal_per_serving"),
  proteinGPerServing: numeric("protein_g_per_serving"),
  carbsGPerServing: numeric("carbs_g_per_serving"),
  fatGPerServing: numeric("fat_g_per_serving"),
}).existing();
