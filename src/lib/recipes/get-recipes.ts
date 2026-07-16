import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema";

export const RECIPE_STATUSES = ["ready", "draft", "rejected"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export function isRecipeStatus(value: string | undefined): value is RecipeStatus {
  return value !== undefined && (RECIPE_STATUSES as readonly string[]).includes(value);
}

/** Shared by GET /api/recipes and the Recipes Server Component. */
export async function getRecipes(status: RecipeStatus | undefined) {
  return status
    ? db.select().from(recipes).where(eq(recipes.status, status))
    : db.select().from(recipes);
}
