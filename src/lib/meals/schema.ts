import { z } from "zod";

const ingredientInputSchema = z.object({
  productId: z.uuid(),
  quantityG: z.coerce.number().positive(),
});

export const mealInputSchema = z.object({
  name: z.string().trim().min(1),
  ingredients: z.array(ingredientInputSchema).min(1),
});

export type MealInput = z.infer<typeof mealInputSchema>;

export const mealUpdateSchema = mealInputSchema.partial();
