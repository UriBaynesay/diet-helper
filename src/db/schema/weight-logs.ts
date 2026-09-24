import { pgTable, uuid, date, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    weightKg: numeric("weight_kg").notNull(),
    loggedOn: date("logged_on", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("weight_logs_user_date_unique").on(table.userId, table.loggedOn)]
);
