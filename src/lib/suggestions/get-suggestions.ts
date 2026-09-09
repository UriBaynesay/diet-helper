import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, meals, mealIngredients, products } from "@/db/schema";
import { findActiveGoal } from "@/lib/goals/active-goal";
import { macrosForQuantity } from "@/lib/diary/macros";
import { buildCandidateForMeal, rankSuggestions } from "@/lib/suggestions/scorer";

function reasonText(
  candidate: { macros: { kcal: number; proteinG: number }; score: number },
  remaining: { kcal: number }
): string {
  const kcalPct =
    remaining.kcal > 0 ? Math.round((candidate.macros.kcal / remaining.kcal) * 100) : 100;
  return `מספק ${kcalPct}% מהיעד שנותר להיום, ${Math.round(candidate.macros.kcal)} קלוריות.`;
}

/** Shared by GET /api/suggestions and the Suggestions Server Component. */
export async function getSuggestions(userId: string, date: string) {
  const entries = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryDate, new Date(date))));
  const consumed = entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + Number(entry.kcal),
      proteinG: acc.proteinG + Number(entry.proteinG),
      carbsG: acc.carbsG + Number(entry.carbsG),
      fatG: acc.fatG + Number(entry.fatG),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const activeGoal = await findActiveGoal(userId, new Date(date));
  if (!activeGoal) {
    return { remaining: null, suggestions: [] };
  }

  const remaining = {
    kcal: Number(activeGoal.targetKcal) - consumed.kcal,
    proteinG: Number(activeGoal.targetProteinG) - consumed.proteinG,
    carbsG: Number(activeGoal.targetCarbsG) - consumed.carbsG,
    fatG: Number(activeGoal.targetFatG) - consumed.fatG,
  };

  const allMeals = await db.select().from(meals);

  const candidates = [];
  for (const meal of allMeals) {
    const ingredients = await db
      .select({
        archivedAt: products.archivedAt,
        quantityG: mealIngredients.quantityG,
        kcalPer100g: products.kcalPer100g,
        proteinPer100g: products.proteinPer100g,
        carbsPer100g: products.carbsPer100g,
        fatPer100g: products.fatPer100g,
      })
      .from(mealIngredients)
      .innerJoin(products, eq(mealIngredients.productId, products.id))
      .where(eq(mealIngredients.mealId, meal.id));

    if (ingredients.length === 0 || ingredients.some((i) => i.archivedAt !== null)) continue;

    // No stored/view nutrition — sum macrosForQuantity across ingredients,
    // same primitive get-meal-detail.ts uses for the meal detail screen.
    const totalMacros = ingredients.reduce(
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

    const candidate = buildCandidateForMeal(meal, totalMacros, remaining);
    if (candidate) candidates.push(candidate);
  }

  const top = rankSuggestions(candidates, 5).map((candidate) => ({
    ...candidate,
    reason: reasonText(candidate, remaining),
  }));

  return { remaining, suggestions: top };
}
