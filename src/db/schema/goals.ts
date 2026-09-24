import { pgTable, uuid, date, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const goalTypeEnum = pgEnum("goal_type", ["lose", "maintain", "gain"]);
export const goalSourceEnum = pgEnum("goal_source", ["calculated", "manual"]);

// Append-only: the active goal for a date is the row with the greatest
// effective_from <= that date. Never update/delete a row to "change" a goal.
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    effectiveFrom: date("effective_from", { mode: "date" }).notNull(),
    goalType: goalTypeEnum("goal_type").notNull(),
    targetKcal: numeric("target_kcal").notNull(),
    targetProteinG: numeric("target_protein_g").notNull(),
    targetCarbsG: numeric("target_carbs_g").notNull(),
    targetFatG: numeric("target_fat_g").notNull(),
    source: goalSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_effective_from_idx").on(table.userId, table.effectiveFrom)]
);
