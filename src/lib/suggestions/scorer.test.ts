import { describe, expect, it } from "vitest";
import {
  scoreServing,
  isWithinKcalLimit,
  buildCandidatesForRecipe,
  rankSuggestions,
} from "./scorer";

describe("scoreServing", () => {
  it("scores a closer macro match lower than a worse one (spec acceptance criterion)", () => {
    // 600 kcal / 45g protein remaining; a 550/42 recipe should outrank a 550/10 one.
    const remaining = { kcal: 600, proteinG: 45, carbsG: 60, fatG: 20 };
    const goodMatch = scoreServing({ kcal: 550, proteinG: 42, carbsG: 55, fatG: 18 }, remaining);
    const badMatch = scoreServing({ kcal: 550, proteinG: 10, carbsG: 55, fatG: 18 }, remaining);
    expect(goodMatch).toBeLessThan(badMatch);
  });

  it("scores an exact match as zero", () => {
    const remaining = { kcal: 500, proteinG: 40, carbsG: 50, fatG: 15 };
    expect(scoreServing({ ...remaining }, remaining)).toBe(0);
  });
});

describe("isWithinKcalLimit", () => {
  it("excludes a serving needing more than 20% over remaining kcal", () => {
    // A recipe serving needing 3x the remaining calories never appears.
    expect(isWithinKcalLimit(1800, 600)).toBe(false);
    expect(isWithinKcalLimit(720, 600)).toBe(true); // exactly at the 20% boundary
    expect(isWithinKcalLimit(721, 600)).toBe(false);
  });

  it("falls back to a 200kcal cap when remaining is zero or negative", () => {
    expect(isWithinKcalLimit(150, 0)).toBe(true);
    expect(isWithinKcalLimit(250, -50)).toBe(false);
  });
});

describe("buildCandidatesForRecipe", () => {
  it("produces half/single/double-serving candidates and filters by kcal limit", () => {
    const remaining = { kcal: 600, proteinG: 45, carbsG: 60, fatG: 20 };
    const perServing = { kcal: 500, proteinG: 40, carbsG: 50, fatG: 15 };
    const candidates = buildCandidatesForRecipe({ id: "r1", name: "Test" }, perServing, remaining);

    // 250 (0.5x), 500 (1x) pass; 1000 (2x) exceeds 600*1.2=720, filtered out.
    expect(candidates.map((c) => c.servingsMultiplier)).toEqual([0.5, 1]);
  });
});

describe("rankSuggestions", () => {
  it("sorts by score ascending and caps at the limit", () => {
    const candidates = [
      { recipeId: "a", recipeName: "A", servingsMultiplier: 1, macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 3 },
      { recipeId: "b", recipeName: "B", servingsMultiplier: 1, macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 1 },
      { recipeId: "c", recipeName: "C", servingsMultiplier: 1, macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 2 },
    ];
    const ranked = rankSuggestions(candidates, 2);
    expect(ranked.map((c) => c.recipeId)).toEqual(["b", "c"]);
  });
});
