export type UnitConversionRow = {
  unit: string;
  ingredientPattern: string | null;
  grams: number;
};

export type ConversionResult =
  | { status: "resolved"; grams: number; matchedBy: "exact" | "generic" }
  | { status: "unresolved" };

/**
 * Lookup order per spec: exact (unit + ingredient pattern match) -> generic
 * unit -> fail. Unit comparison is case-insensitive; the ingredient pattern
 * is matched as a case-insensitive substring of the parsed ingredient name.
 */
export function resolveUnitToGrams(
  unit: string,
  ingredientName: string,
  conversions: UnitConversionRow[]
): ConversionResult {
  const normalizedUnit = unit.trim().toLowerCase();
  const normalizedName = ingredientName.trim().toLowerCase();

  const exact = conversions.find(
    (c) =>
      c.unit.toLowerCase() === normalizedUnit &&
      c.ingredientPattern !== null &&
      normalizedName.includes(c.ingredientPattern.toLowerCase())
  );
  if (exact) return { status: "resolved", grams: exact.grams, matchedBy: "exact" };

  const generic = conversions.find(
    (c) => c.unit.toLowerCase() === normalizedUnit && c.ingredientPattern === null
  );
  if (generic) return { status: "resolved", grams: generic.grams, matchedBy: "generic" };

  return { status: "unresolved" };
}

/** Converts a parsed quantity + unit into grams using the resolved per-unit gram weight. */
export function quantityToGrams(quantity: number, gramsPerUnit: number): number {
  return quantity * gramsPerUnit;
}
