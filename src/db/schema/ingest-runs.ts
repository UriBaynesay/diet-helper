import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const ingestRunStatusEnum = pgEnum("ingest_run_status", [
  "running",
  "succeeded",
  "failed",
]);

export const ingestRuns = pgTable("ingest_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceName: text("source_name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestRunStatusEnum("status").notNull().default("running"),
  recipesFound: integer("recipes_found").notNull().default(0),
  recipesCreated: integer("recipes_created").notNull().default(0),
  recipesSkipped: integer("recipes_skipped").notNull().default(0),
  error: text("error"),
});
