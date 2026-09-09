import { pgTable, uuid, numeric, timestamp } from "drizzle-orm/pg-core";
import { meals } from "./meals";
import { products } from "./products";

export const mealIngredients = pgTable("meal_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealId: uuid("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantityG: numeric("quantity_g").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
