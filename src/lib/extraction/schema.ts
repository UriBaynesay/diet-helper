import { z } from "zod";

export const extractionResultSchema = z.object({
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  serving_label: z.string().nullable(),
  serving_size_g: z.number().nullable(),
  basis: z.enum(["per_100g", "per_serving"]),
  kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fiber_g: z.number().nullable(),
  sugar_g: z.number().nullable(),
  sodium_mg: z.number().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
