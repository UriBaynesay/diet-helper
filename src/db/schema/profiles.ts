import {
  pgTable,
  uuid,
  boolean,
  text,
  date,
  integer,
  timestamp,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

export const sexEnum = pgEnum("sex", ["male", "female"]);

export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  isAllowed: boolean("is_allowed").notNull().default(false),
  name: text("name"),
  sex: sexEnum("sex"),
  birthDate: date("birth_date", { mode: "date" }),
  heightCm: integer("height_cm"),
  activityLevel: activityLevelEnum("activity_level"),
  timezone: text("timezone").notNull().default("Asia/Jerusalem"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
