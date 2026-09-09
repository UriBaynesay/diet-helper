import { z } from "zod";

export const parsedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  // A rough gram estimate for the parsed quantity+unit, when derivable
  // (e.g. "2 cups flour" -> ~240g). Null when the model can't reasonably
  // estimate one (e.g. "salt to taste", count-based items with no typical
  // weight). Always just a starting point for the user to correct.
  estimatedQuantityG: z.number().nullable(),
});

export const parseMealResultSchema = z.object({
  name: z.string().nullable(),
  ingredients: z.array(parsedIngredientSchema),
});

export type ParsedIngredient = z.infer<typeof parsedIngredientSchema>;
export type ParseMealResult = z.infer<typeof parseMealResultSchema>;
