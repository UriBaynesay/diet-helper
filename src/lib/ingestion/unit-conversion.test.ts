import { describe, expect, it } from "vitest";
import { resolveUnitToGrams, quantityToGrams } from "./unit-conversion";

const conversions = [
  { unit: "cup", ingredientPattern: "flour", grams: 120 },
  { unit: "cup", ingredientPattern: null, grams: 240 },
  { unit: "tbsp", ingredientPattern: null, grams: 15 },
];

describe("resolveUnitToGrams", () => {
  it("prefers an exact ingredient-pattern match over the generic unit", () => {
    const result = resolveUnitToGrams("cup", "all-purpose flour", conversions);
    expect(result).toEqual({ status: "resolved", grams: 120, matchedBy: "exact" });
  });

  it("falls back to the generic unit when no ingredient pattern matches", () => {
    const result = resolveUnitToGrams("cup", "water", conversions);
    expect(result).toEqual({ status: "resolved", grams: 240, matchedBy: "generic" });
  });

  it("is case-insensitive on both unit and ingredient name", () => {
    const result = resolveUnitToGrams("CUP", "ALL-PURPOSE FLOUR", conversions);
    expect(result).toEqual({ status: "resolved", grams: 120, matchedBy: "exact" });
  });

  it("returns unresolved when nothing matches", () => {
    const result = resolveUnitToGrams("gallon", "milk", conversions);
    expect(result).toEqual({ status: "unresolved" });
  });
});

describe("quantityToGrams", () => {
  it("multiplies quantity by the resolved per-unit gram weight", () => {
    expect(quantityToGrams(2, 120)).toBe(240);
  });
});
