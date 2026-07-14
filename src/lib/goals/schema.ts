import { z } from "zod";

export const goalTypeValues = ["lose", "maintain", "gain"] as const;
export const goalSourceValues = ["calculated", "manual"] as const;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const goalInputSchema = z.object({
  effectiveFrom: dateOnly.optional(),
  goalType: z.enum(goalTypeValues),
  targetKcal: z.coerce.number().positive(),
  targetProteinG: z.coerce.number().min(0),
  targetCarbsG: z.coerce.number().min(0),
  targetFatG: z.coerce.number().min(0),
  source: z.enum(goalSourceValues),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
