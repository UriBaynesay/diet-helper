import { z } from "zod";

const nonNegative = z.coerce.number().min(0);

export const productInputSchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1).nullish(),
  barcode: z.string().trim().min(1).nullish(),
  servingLabel: z.string().trim().min(1).nullish(),
  servingSizeG: nonNegative.nullish(),
  kcalPer100g: nonNegative,
  proteinPer100g: nonNegative,
  carbsPer100g: nonNegative,
  fatPer100g: nonNegative,
  fiberPer100g: nonNegative.nullish(),
  sugarPer100g: nonNegative.nullish(),
  sodiumMgPer100g: nonNegative.nullish(),
  // Set only when this product is being saved from a reviewed, human-confirmed
  // extraction job (spec FR-3) — never trust a job's parsed values without
  // this explicit confirmation step.
  extractionJobId: z.uuid().nullish(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.partial();

/**
 * 4/4/9 sanity check (spec FR-2): warn, never block, when the macro-derived
 * kcal differs from the stated kcal by more than 15% — catches most OCR
 * misreads and typos without rejecting a legitimately unusual product.
 */
export function kcalSanityWarning(input: {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}): string | null {
  const derived =
    4 * input.proteinPer100g + 4 * input.carbsPer100g + 9 * input.fatPer100g;
  if (input.kcalPer100g === 0) {
    return derived === 0 ? null : "kcal_mismatch";
  }
  const diffRatio = Math.abs(derived - input.kcalPer100g) / input.kcalPer100g;
  return diffRatio > 0.15 ? "kcal_mismatch" : null;
}
