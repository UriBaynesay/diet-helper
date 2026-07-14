import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const productSourceEnum = pgEnum("product_source", ["manual", "image", "ingested"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by").references(() => users.id),
    name: text("name").notNull(),
    brand: text("brand"),
    barcode: text("barcode"),
    servingLabel: text("serving_label"),
    servingSizeG: numeric("serving_size_g"),
    kcalPer100g: numeric("kcal_per_100g").notNull(),
    proteinPer100g: numeric("protein_per_100g").notNull(),
    carbsPer100g: numeric("carbs_per_100g").notNull(),
    fatPer100g: numeric("fat_per_100g").notNull(),
    fiberPer100g: numeric("fiber_per_100g"),
    sugarPer100g: numeric("sugar_per_100g"),
    sodiumMgPer100g: numeric("sodium_mg_per_100g"),
    source: productSourceEnum("source").notNull().default("manual"),
    imagePath: text("image_path"),
    isVerified: boolean("is_verified").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
  ]
);
