import { describe, expect, it } from "vitest";
import { macrosForQuantity } from "./macros";

describe("macrosForQuantity", () => {
  it("scales per-100g values by quantity (spec acceptance criterion)", () => {
    // 150g of a 200 kcal/100g product adds exactly 300 kcal.
    const result = macrosForQuantity(
      { kcalPer100g: "200", proteinPer100g: "20", carbsPer100g: "10", fatPer100g: "5" },
      150
    );
    expect(result.kcal).toBe(300);
    expect(result.proteinG).toBe(30);
    expect(result.carbsG).toBe(15);
    expect(result.fatG).toBe(7.5);
  });

  it("returns zero macros for zero quantity", () => {
    const result = macrosForQuantity(
      { kcalPer100g: "165", proteinPer100g: "31", carbsPer100g: "0", fatPer100g: "3.6" },
      0
    );
    expect(result).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
