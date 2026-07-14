import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const sexValues = ["male", "female"] as const;
export const activityLevelValues = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

export const profileUpdateSchema = z.object({
  sex: z.enum(sexValues).optional(),
  birthDate: dateOnly.optional(),
  heightCm: z.coerce.number().positive().optional(),
  activityLevel: z.enum(activityLevelValues).optional(),
  notificationsEnabled: z.boolean().optional(),
  weightKg: z.coerce.number().positive().optional(),
  loggedOn: dateOnly.optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
