import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients, recipeNutrition, products } from "@/db/schema";

/** Shared by GET /api/recipes/:id and the recipe detail Server Component. */
export async function getRecipeDetail(id: string) {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!recipe) return null;

  const ingredients = await db
    .select({
      id: recipeIngredients.id,
      productId: recipeIngredients.productId,
      quantityG: recipeIngredients.quantityG,
      productName: products.name,
    })
    .from(recipeIngredients)
    .innerJoin(products, eq(recipeIngredients.productId, products.id))
    .where(eq(recipeIngredients.recipeId, id));

  const [nutrition] = await db
    .select()
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, id));

  return { recipe, ingredients, nutrition: nutrition ?? null };
}
