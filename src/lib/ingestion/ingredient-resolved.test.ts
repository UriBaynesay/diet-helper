import { describe, expect, it } from "vitest";
import { isIngredientResolved } from "./ingredient-resolved";

describe("isIngredientResolved", () => {
  it("is resolved when both product and quantity are set", () => {
    expect(isIngredientResolved({ productId: "p1", quantityG: "150" })).toBe(true);
  });

  it("is resolved when marked ignorable (quantity_g = '0'), even with no product", () => {
    // Regression test: this exact case was a real bug — promotion originally
    // required product_id on every ingredient, so "ignore" could never
    // unblock a recipe, contradicting spec §11.2 step 5.
    expect(isIngredientResolved({ productId: null, quantityG: "0" })).toBe(true);
  });

  it("is not resolved when unmatched with no quantity", () => {
    expect(isIngredientResolved({ productId: null, quantityG: null })).toBe(false);
  });

  it("is not resolved when matched to a product but quantity is still unknown", () => {
    expect(isIngredientResolved({ productId: "p1", quantityG: null })).toBe(false);
  });

  it("is not resolved when quantity is known but no product is matched (and not ignorable)", () => {
    expect(isIngredientResolved({ productId: null, quantityG: "150" })).toBe(false);
  });
});
