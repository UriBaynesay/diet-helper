import { pgTable, uuid, date, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const notificationTypeEnum = pgEnum("notification_type", ["daily_summary"]);
export const notificationStatusEnum = pgEnum("notification_status", ["sent", "failed"]);

export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  type: notificationTypeEnum("type").notNull(),
  coversDate: date("covers_date", { mode: "date" }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  status: notificationStatusEnum("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
