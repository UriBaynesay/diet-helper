import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

// A meal is strictly a name + its ingredients (see meal-ingredients.ts) —
// no servings, prep time, instructions, tags, or image. Nutrition is never
// stored here; it's always computed by summing macrosForQuantity() across
// the joined ingredients (src/lib/diary/macros.ts), the same primitive a
// product-based diary entry uses.
export const meals = pgTable("meals", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by").references(() => profiles.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
