import { z } from "zod";

export const unitConversionInputSchema = z.object({
  unit: z.string().trim().min(1),
  ingredientPattern: z.string().trim().min(1).nullish(),
  grams: z.coerce.number().positive(),
});

export type UnitConversionInput = z.infer<typeof unitConversionInputSchema>;
