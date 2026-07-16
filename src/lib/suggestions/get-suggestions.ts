import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, recipes, recipeIngredients, recipeNutrition, products } from "@/db/schema";
import { findActiveGoal } from "@/lib/goals/active-goal";
import { buildCandidatesForRecipe, rankSuggestions } from "@/lib/suggestions/scorer";

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

  const allRecipes = await db.select().from(recipes);

  const candidates = [];
  for (const recipe of allRecipes) {
    const ingredients = await db
      .select({ archivedAt: products.archivedAt })
      .from(recipeIngredients)
      .innerJoin(products, eq(recipeIngredients.productId, products.id))
      .where(eq(recipeIngredients.recipeId, recipe.id));

    if (ingredients.some((i) => i.archivedAt !== null)) continue;

    const [nutrition] = await db
      .select()
      .from(recipeNutrition)
      .where(eq(recipeNutrition.recipeId, recipe.id));
    if (!nutrition) continue;

    const perServing = {
      kcal: Number(nutrition.kcalPerServing),
      proteinG: Number(nutrition.proteinGPerServing),
      carbsG: Number(nutrition.carbsGPerServing),
      fatG: Number(nutrition.fatGPerServing),
    };

    candidates.push(...buildCandidatesForRecipe(recipe, perServing, remaining));
  }

  const top = rankSuggestions(candidates, 5).map((candidate) => ({
    ...candidate,
    reason: reasonText(candidate, remaining),
  }));

  return { remaining, suggestions: top };
}
