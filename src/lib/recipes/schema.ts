import { z } from "zod";

const ingredientInputSchema = z.object({
  productId: z.uuid(),
  quantityG: z.coerce.number().positive(),
});

export const recipeInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullish(),
  servings: z.coerce.number().int().positive(),
  instructions: z.string().trim().min(1).nullish(),
  prepMinutes: z.coerce.number().int().nonnegative().nullish(),
  tags: z.array(z.string().trim().min(1)).nullish(),
  imageUrl: z.string().trim().min(1).nullish(),
  ingredients: z.array(ingredientInputSchema).min(1),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const recipeUpdateSchema = recipeInputSchema.partial();
