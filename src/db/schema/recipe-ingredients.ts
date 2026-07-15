import { pgTable, uuid, text, numeric, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { recipes } from "./recipes";
import { products } from "./products";

export const matchConfidenceEnum = pgEnum("match_confidence", [
  "high",
  "medium",
  "low",
  "unmatched",
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  quantityG: numeric("quantity_g"),
  // raw_text and the parsed_* columns are populated by the ingestion
  // pipeline (phase 8) — null for manually-created ingredient rows.
  rawText: text("raw_text"),
  parsedQuantity: numeric("parsed_quantity"),
  parsedUnit: text("parsed_unit"),
  parsedName: text("parsed_name"),
  matchConfidence: matchConfidenceEnum("match_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
