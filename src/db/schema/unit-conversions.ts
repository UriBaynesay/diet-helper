import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const unitConversions = pgTable("unit_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  unit: text("unit").notNull(),
  ingredientPattern: text("ingredient_pattern"),
  grams: numeric("grams").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
