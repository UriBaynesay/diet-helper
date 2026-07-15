export type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

const WEIGHTS = { kcal: 1.5, proteinG: 2.0, carbsG: 1.0, fatG: 1.0 };

/**
 * Lower is better. Each term is the relative deviation of a recipe-serving's
 * macro from what's remaining today, weighted by how much that macro matters
 * (protein weighted hardest — it's the one people actually miss).
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

export function scaleServing(perServing: Macros, multiplier: number): Macros {
  return {
    kcal: perServing.kcal * multiplier,
    proteinG: perServing.proteinG * multiplier,
    carbsG: perServing.carbsG * multiplier,
    fatG: perServing.fatG * multiplier,
  };
}

/** Excludes candidates whose kcal exceeds remaining kcal by more than 20%. */
export function isWithinKcalLimit(servingKcal: number, remainingKcal: number): boolean {
  if (remainingKcal <= 0) return servingKcal <= 200;
  return servingKcal <= remainingKcal * 1.2;
}

export type SuggestionCandidate = {
  recipeId: string;
  recipeName: string;
  servingsMultiplier: number;
  macros: Macros;
  score: number;
};

/**
 * Builds the ranked candidate list for one recipe's base per-serving
 * nutrition against today's remaining macros — half, single, and double
 * servings are scored as separate candidates, then hard-filtered on kcal.
 */
export function buildCandidatesForRecipe(
  recipe: { id: string; name: string },
  perServing: Macros,
  remaining: Macros
): SuggestionCandidate[] {
  const multipliers = [0.5, 1, 2];
  return multipliers
    .map((multiplier) => {
      const macros = scaleServing(perServing, multiplier);
      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        servingsMultiplier: multiplier,
        macros,
        score: scoreServing(macros, remaining),
      };
    })
    .filter((candidate) => isWithinKcalLimit(candidate.macros.kcal, remaining.kcal));
}

export function rankSuggestions(
  candidates: SuggestionCandidate[],
  limit = 5
): SuggestionCandidate[] {
  return [...candidates].sort((a, b) => a.score - b.score).slice(0, limit);
}
