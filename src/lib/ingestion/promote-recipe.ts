import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients } from "@/db/schema";
import { isIngredientResolved } from "./ingredient-resolved";

/** Promotes a recipe to ready once every ingredient is resolved (never demotes). */
export async function promoteRecipeIfReady(recipeId: string) {
  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));

  const allResolved = ingredients.length > 0 && ingredients.every(isIngredientResolved);
  if (allResolved) {
    await db.update(recipes).set({ status: "ready" }).where(eq(recipes.id, recipeId));
  }
}
