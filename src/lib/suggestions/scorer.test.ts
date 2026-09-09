import { describe, expect, it } from "vitest";
import {
  scoreServing,
  isWithinKcalLimit,
  buildCandidateForMeal,
  rankSuggestions,
} from "./scorer";

describe("scoreServing", () => {
  it("scores a closer macro match lower than a worse one (spec acceptance criterion)", () => {
    // 600 kcal / 45g protein remaining; a 550/42 meal should outrank a 550/10 one.
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
  it("excludes a meal needing more than 20% over remaining kcal", () => {
    // A meal needing 3x the remaining calories never appears.
    expect(isWithinKcalLimit(1800, 600)).toBe(false);
    expect(isWithinKcalLimit(720, 600)).toBe(true); // exactly at the 20% boundary
    expect(isWithinKcalLimit(721, 600)).toBe(false);
  });

  it("falls back to a 200kcal cap when remaining is zero or negative", () => {
    expect(isWithinKcalLimit(150, 0)).toBe(true);
    expect(isWithinKcalLimit(250, -50)).toBe(false);
  });
});

describe("buildCandidateForMeal", () => {
  it("produces one candidate scored against remaining macros when within the kcal limit", () => {
    const remaining = { kcal: 600, proteinG: 45, carbsG: 60, fatG: 20 };
    const totalMacros = { kcal: 500, proteinG: 40, carbsG: 50, fatG: 15 };
    const candidate = buildCandidateForMeal({ id: "m1", name: "Test" }, totalMacros, remaining);

    expect(candidate).not.toBeNull();
    expect(candidate?.mealId).toBe("m1");
    expect(candidate?.macros).toEqual(totalMacros);
  });

  it("returns null when the meal's total exceeds the kcal limit", () => {
    const remaining = { kcal: 600, proteinG: 45, carbsG: 60, fatG: 20 };
    // 1000 kcal exceeds 600*1.2=720.
    const totalMacros = { kcal: 1000, proteinG: 80, carbsG: 100, fatG: 30 };
    const candidate = buildCandidateForMeal({ id: "m1", name: "Test" }, totalMacros, remaining);

    expect(candidate).toBeNull();
  });
});

describe("rankSuggestions", () => {
  it("sorts by score ascending and caps at the limit", () => {
    const candidates = [
      { mealId: "a", mealName: "A", macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 3 },
      { mealId: "b", mealName: "B", macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 1 },
      { mealId: "c", mealName: "C", macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, score: 2 },
    ];
    const ranked = rankSuggestions(candidates, 2);
    expect(ranked.map((c) => c.mealId)).toEqual(["b", "c"]);
  });
});
