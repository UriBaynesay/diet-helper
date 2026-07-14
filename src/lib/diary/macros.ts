export function macrosForQuantity(
  product: {
    kcalPer100g: string;
    proteinPer100g: string;
    carbsPer100g: string;
    fatPer100g: string;
  },
  quantityG: number
) {
  const factor = quantityG / 100;
  return {
    kcal: Number(product.kcalPer100g) * factor,
    proteinG: Number(product.proteinPer100g) * factor,
    carbsG: Number(product.carbsPer100g) * factor,
    fatG: Number(product.fatPer100g) * factor,
  };
}
