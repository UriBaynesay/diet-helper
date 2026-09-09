import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealIngredients, products } from "@/db/schema";
import { macrosForQuantity } from "@/lib/diary/macros";

/** Shared by GET /api/meals/:id and the meal detail Server Component. */
export async function getMealDetail(id: string) {
  const meal = await db.query.meals.findFirst({ where: eq(meals.id, id) });
  if (!meal) return null;

  const ingredients = await db
    .select({
      id: mealIngredients.id,
      productId: mealIngredients.productId,
      quantityG: mealIngredients.quantityG,
      productName: products.name,
      kcalPer100g: products.kcalPer100g,
      proteinPer100g: products.proteinPer100g,
      carbsPer100g: products.carbsPer100g,
      fatPer100g: products.fatPer100g,
    })
    .from(mealIngredients)
    .innerJoin(products, eq(mealIngredients.productId, products.id))
    .where(eq(mealIngredients.mealId, id));

  // No stored/view-computed nutrition — a meal's total is always the
  // literal sum of each ingredient's macrosForQuantity(), same primitive a
  // product-based diary entry uses.
  const nutrition = ingredients.reduce(
    (acc, ingredient) => {
      const macros = macrosForQuantity(ingredient, Number(ingredient.quantityG));
      return {
        kcal: acc.kcal + macros.kcal,
        proteinG: acc.proteinG + macros.proteinG,
        carbsG: acc.carbsG + macros.carbsG,
        fatG: acc.fatG + macros.fatG,
      };
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return { meal, ingredients, nutrition };
}
