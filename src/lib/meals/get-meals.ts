import { db } from "@/db";
import { meals } from "@/db/schema";

/** Shared by GET /api/meals and the Meals Server Component. */
export async function getMeals() {
  return db.select().from(meals);
}
