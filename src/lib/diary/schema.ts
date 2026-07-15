import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

const productEntrySchema = z.object({
  entryDate: dateOnly,
  mealType: z.enum(mealTypes),
  productId: z.uuid(),
  quantityG: z.coerce.number().positive(),
  recipeId: z.undefined().optional(),
});

const recipeEntrySchema = z.object({
  entryDate: dateOnly,
  mealType: z.enum(mealTypes),
  recipeId: z.uuid(),
  servings: z.coerce.number().positive(),
  productId: z.undefined().optional(),
});

// Mirrors the DB's exactly-one-of-product_id/recipe_id CHECK constraint.
export const diaryEntryInputSchema = z.union([productEntrySchema, recipeEntrySchema]);

export type ProductDiaryEntryInput = z.infer<typeof productEntrySchema>;
export type RecipeDiaryEntryInput = z.infer<typeof recipeEntrySchema>;
export type DiaryEntryInput = z.infer<typeof diaryEntryInputSchema>;

export function isProductEntry(input: DiaryEntryInput): input is ProductDiaryEntryInput {
  return "productId" in input && input.productId !== undefined;
}

export const diaryEntryUpdateSchema = z.object({
  entryDate: dateOnly.optional(),
  mealType: z.enum(mealTypes).optional(),
  quantityG: z.coerce.number().positive().optional(),
});

export type DiaryEntryUpdate = z.infer<typeof diaryEntryUpdateSchema>;
