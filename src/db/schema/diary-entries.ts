import { pgTable, uuid, date, numeric, timestamp, pgEnum, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { products } from "./products";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    entryDate: date("entry_date", { mode: "date" }).notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    productId: uuid("product_id").references(() => products.id),
    // recipe_id has no FK yet — the recipes table doesn't exist until phase 5.
    recipeId: uuid("recipe_id"),
    quantityG: numeric("quantity_g"),
    servings: numeric("servings"),
    // Denormalised snapshot at log time (spec FR-1): a later edit to the
    // source product's nutrition must never change a past day's log.
    kcal: numeric("kcal").notNull(),
    proteinG: numeric("protein_g").notNull(),
    carbsG: numeric("carbs_g").notNull(),
    fatG: numeric("fat_g").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("diary_entries_user_date_idx").on(table.userId, table.entryDate),
    check(
      "diary_entries_exactly_one_source",
      sql`(${table.productId} IS NOT NULL) <> (${table.recipeId} IS NOT NULL)`
    ),
  ]
);
