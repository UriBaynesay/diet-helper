import { describe, expect, it } from "vitest";
import { kjToKcal, perServingToPer100g } from "./normalize";

describe("kjToKcal", () => {
  it("converts kJ to kcal (spec: kcal = kJ / 4.184)", () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 9);
  });
});

describe("perServingToPer100g", () => {
  it("normalizes a per-serving panel to per-100g (spec acceptance criterion)", () => {
    // A per-serving panel (30g -> 120 kcal) is stored as 400 kcal/100g.
    const result = perServingToPer100g(
      { kcal: 120, proteinG: 3, carbsG: 15, fatG: 6, fiberG: 1, sugarG: 2, sodiumMg: 50 },
      30
    );
    expect(result.kcal).toBe(400);
    expect(result.proteinG).toBe(10);
    expect(result.carbsG).toBe(50);
    expect(result.fatG).toBe(20);
    expect(result.fiberG).toBeCloseTo(3.333, 3);
    expect(result.sugarG).toBeCloseTo(6.667, 3);
    expect(result.sodiumMg).toBeCloseTo(166.667, 3);
  });

  it("passes through null optional fields", () => {
    const result = perServingToPer100g(
      { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: null, sugarG: null, sodiumMg: null },
      50
    );
    expect(result.fiberG).toBeNull();
    expect(result.sugarG).toBeNull();
    expect(result.sodiumMg).toBeNull();
  });
});
