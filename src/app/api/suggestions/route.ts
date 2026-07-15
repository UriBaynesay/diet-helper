import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, recipes, recipeIngredients, recipeNutrition, products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { findActiveGoal } from "@/lib/goals/active-goal";
import { buildCandidatesForRecipe, rankSuggestions } from "@/lib/suggestions/scorer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function reasonText(candidate: {
  macros: { kcal: number; proteinG: number };
  score: number;
}, remaining: { kcal: number }): string {
  const kcalPct =
    remaining.kcal > 0 ? Math.round((candidate.macros.kcal / remaining.kcal) * 100) : 100;
  return `מספק ${kcalPct}% מהיעד שנותר להיום, ${Math.round(candidate.macros.kcal)} קלוריות.`;
}

export async function GET(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(date)) {
    return apiError("validation_error", "date must be YYYY-MM-DD", 400);
  }

  const entries = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, user.userId), eq(diaryEntries.entryDate, new Date(date))));
  const consumed = entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + Number(entry.kcal),
      proteinG: acc.proteinG + Number(entry.proteinG),
      carbsG: acc.carbsG + Number(entry.carbsG),
      fatG: acc.fatG + Number(entry.fatG),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const activeGoal = await findActiveGoal(user.userId, new Date(date));
  if (!activeGoal) {
    return apiError("no_goal", "No active goal — set one before requesting suggestions", 400);
  }

  const remaining = {
    kcal: Number(activeGoal.targetKcal) - consumed.kcal,
    proteinG: Number(activeGoal.targetProteinG) - consumed.proteinG,
    carbsG: Number(activeGoal.targetCarbsG) - consumed.carbsG,
    fatG: Number(activeGoal.targetFatG) - consumed.fatG,
  };

  const readyRecipes = await db.select().from(recipes).where(eq(recipes.status, "ready"));

  const candidates = [];
  for (const recipe of readyRecipes) {
    const ingredients = await db
      .select({ archivedAt: products.archivedAt })
      .from(recipeIngredients)
      .innerJoin(products, eq(recipeIngredients.productId, products.id))
      .where(eq(recipeIngredients.recipeId, recipe.id));

    // Hard filter: a recipe referencing an archived product can't be logged.
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

  return apiData({ remaining, suggestions: top });
}
