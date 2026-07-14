import { describe, expect, it } from "vitest";
import { kcalSanityWarning } from "./schema";

describe("kcalSanityWarning", () => {
  it("passes when the 4/4/9 derivation matches stated kcal", () => {
    // chicken breast: 165 kcal/100g vs 4*31 + 4*0 + 9*3.6 = 156.4 (within 15%)
    expect(
      kcalSanityWarning({
        kcalPer100g: 165,
        proteinPer100g: 31,
        carbsPer100g: 0,
        fatPer100g: 3.6,
      })
    ).toBeNull();
  });

  it("flags a mismatch beyond 15%", () => {
    expect(
      kcalSanityWarning({
        kcalPer100g: 500,
        proteinPer100g: 2,
        carbsPer100g: 2,
        fatPer100g: 1,
      })
    ).toBe("kcal_mismatch");
  });

  it("treats all-zero macros as consistent", () => {
    expect(
      kcalSanityWarning({
        kcalPer100g: 0,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
      })
    ).toBeNull();
  });

  it("flags zero stated kcal with non-zero derived kcal", () => {
    expect(
      kcalSanityWarning({
        kcalPer100g: 0,
        proteinPer100g: 5,
        carbsPer100g: 0,
        fatPer100g: 0,
      })
    ).toBe("kcal_mismatch");
  });
});
