export type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

const WEIGHTS = { kcal: 1.5, proteinG: 2.0, carbsG: 1.0, fatG: 1.0 };

/**
 * Lower is better. Each term is the relative deviation of a meal's total
 * macros from what's remaining today, weighted by how much that macro
 * matters (protein weighted hardest — it's the one people actually miss).
 */
export function scoreServing(serving: Macros, remaining: Macros): number {
  const kcalTerm = (WEIGHTS.kcal * Math.abs(serving.kcal - remaining.kcal)) / Math.max(remaining.kcal, 1);
  const proteinTerm =
    (WEIGHTS.proteinG * Math.abs(serving.proteinG - remaining.proteinG)) /
    Math.max(remaining.proteinG, 1);
  const carbsTerm =
    (WEIGHTS.carbsG * Math.abs(serving.carbsG - remaining.carbsG)) / Math.max(remaining.carbsG, 1);
  const fatTerm =
    (WEIGHTS.fatG * Math.abs(serving.fatG - remaining.fatG)) / Math.max(remaining.fatG, 1);
  return kcalTerm + proteinTerm + carbsTerm + fatTerm;
}

/** Excludes candidates whose kcal exceeds remaining kcal by more than 20%. */
export function isWithinKcalLimit(servingKcal: number, remainingKcal: number): boolean {
  if (remainingKcal <= 0) return servingKcal <= 200;
  return servingKcal <= remainingKcal * 1.2;
}

export type SuggestionCandidate = {
  mealId: string;
  mealName: string;
  macros: Macros;
  score: number;
};

/**
 * A meal has exactly one fixed total (no servings to scale) — so there's at
 * most one candidate per meal, not a set of half/single/double-serving
 * variants the way a recipe's per-serving nutrition used to produce.
 * Returns null if the meal's total exceeds the kcal limit against what's
 * remaining today.
 */
export function buildCandidateForMeal(
  meal: { id: string; name: string },
  totalMacros: Macros,
  remaining: Macros
): SuggestionCandidate | null {
  if (!isWithinKcalLimit(totalMacros.kcal, remaining.kcal)) return null;
  return {
    mealId: meal.id,
    mealName: meal.name,
    macros: totalMacros,
    score: scoreServing(totalMacros, remaining),
  };
}

export function rankSuggestions(
  candidates: SuggestionCandidate[],
  limit = 5
): SuggestionCandidate[] {
  return [...candidates].sort((a, b) => a.score - b.score).slice(0, limit);
}
