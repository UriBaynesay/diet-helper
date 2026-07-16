import { db } from "@/db";
import { recipes } from "@/db/schema";

/** Shared by GET /api/recipes and the Recipes Server Component. */
export async function getRecipes() {
  return db.select().from(recipes);
}
