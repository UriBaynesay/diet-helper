import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealIngredients, products } from "@/db/schema";
import { macrosForQuantity } from "@/lib/diary/macros";

/** Shared by GET /api/meals and the Meals Server Component. */
export async function getMeals() {
  const allMeals = await db.select().from(meals);

  // One query for every meal's ingredients rather than N+1 per-meal
  // lookups, then grouped and summed in application code — same
  // macrosForQuantity primitive get-meal-detail.ts uses per meal.
  const rows = await db
    .select({
      mealId: mealIngredients.mealId,
      quantityG: mealIngredients.quantityG,
      kcalPer100g: products.kcalPer100g,
      proteinPer100g: products.proteinPer100g,
      carbsPer100g: products.carbsPer100g,
      fatPer100g: products.fatPer100g,
    })
    .from(mealIngredients)
    .innerJoin(products, eq(mealIngredients.productId, products.id));

  const totalsByMeal = new Map<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }>();
  for (const row of rows) {
    const macros = macrosForQuantity(row, Number(row.quantityG));
    const running = totalsByMeal.get(row.mealId) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    totalsByMeal.set(row.mealId, {
      kcal: running.kcal + macros.kcal,
      proteinG: running.proteinG + macros.proteinG,
      carbsG: running.carbsG + macros.carbsG,
      fatG: running.fatG + macros.fatG,
    });
  }

  return allMeals.map((meal) => ({
    ...meal,
    nutrition: totalsByMeal.get(meal.id) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  }));
}
