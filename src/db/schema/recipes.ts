import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const recipeSourceEnum = pgEnum("recipe_source", ["manual", "ingested"]);
export const recipeStatusEnum = pgEnum("recipe_status", ["draft", "ready", "rejected"]);

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  servings: integer("servings").notNull(),
  instructions: text("instructions"),
  prepMinutes: integer("prep_minutes"),
  tags: text("tags").array(),
  imageUrl: text("image_url"),
  source: recipeSourceEnum("source").notNull().default("manual"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  externalId: text("external_id").unique(),
  status: recipeStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
