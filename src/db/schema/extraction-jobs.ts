import { pgTable, uuid, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { products } from "./products";

export const extractionJobStatusEnum = pgEnum("extraction_job_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
]);

export const extractionJobs = pgTable("extraction_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  imagePath: text("image_path").notNull(),
  status: extractionJobStatusEnum("status").notNull().default("pending"),
  rawResponse: jsonb("raw_response"),
  parsed: jsonb("parsed"),
  confidence: text("confidence"),
  error: text("error"),
  productId: uuid("product_id").references(() => products.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
