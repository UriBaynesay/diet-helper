import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients } from "@/db/schema";

/**
 * An ingredient is resolved if it has both a product and a quantity, OR if
 * it was explicitly marked ignorable (quantity_g = 0, no product needed) —
 * spec §11.2 step 5: an ignorable line is real, it just contributes nothing.
 */
function isIngredientResolved(ingredient: { productId: string | null; quantityG: string | null }) {
  if (ingredient.productId !== null && ingredient.quantityG !== null) return true;
  return ingredient.quantityG === "0";
}

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
