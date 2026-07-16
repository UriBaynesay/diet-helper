/**
 * An ingredient is resolved if it has both a product and a quantity, OR if
 * it was explicitly marked ignorable (quantity_g = 0, no product needed) —
 * spec §11.2 step 5: an ignorable line is real, it just contributes nothing.
 */
export function isIngredientResolved(ingredient: {
  productId: string | null;
  quantityG: string | null;
}): boolean {
  if (ingredient.productId !== null && ingredient.quantityG !== null) return true;
  return ingredient.quantityG === "0";
}
