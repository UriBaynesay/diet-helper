export function kjToKcal(kj: number): number {
  return kj / 4.184;
}

export type PerServingMacros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

/** Converts per-serving nutrition to per-100g using the label's serving size. */
export function perServingToPer100g(
  values: PerServingMacros,
  servingSizeG: number
): PerServingMacros {
  const factor = 100 / servingSizeG;
  return {
    kcal: values.kcal * factor,
    proteinG: values.proteinG * factor,
    carbsG: values.carbsG * factor,
    fatG: values.fatG * factor,
    fiberG: values.fiberG !== null ? values.fiberG * factor : null,
    sugarG: values.sugarG !== null ? values.sugarG * factor : null,
    sodiumMg: values.sodiumMg !== null ? values.sodiumMg * factor : null,
  };
}
