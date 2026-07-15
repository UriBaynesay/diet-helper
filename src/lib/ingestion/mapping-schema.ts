import { z } from "zod";

export const mappingInputSchema = z.object({
  ingredientName: z.string().trim().min(1),
  action: z.enum(["link", "ignore"]),
  productId: z.uuid().nullish(),
});

export type MappingInput = z.infer<typeof mappingInputSchema>;
