import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

export const diaryEntryInputSchema = z.object({
  entryDate: dateOnly,
  mealType: z.enum(mealTypes),
  productId: z.uuid(),
  quantityG: z.coerce.number().positive(),
});

export type DiaryEntryInput = z.infer<typeof diaryEntryInputSchema>;

export const diaryEntryUpdateSchema = z.object({
  entryDate: dateOnly.optional(),
  mealType: z.enum(mealTypes).optional(),
  quantityG: z.coerce.number().positive().optional(),
});

export type DiaryEntryUpdate = z.infer<typeof diaryEntryUpdateSchema>;
