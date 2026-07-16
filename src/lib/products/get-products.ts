import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export const PRODUCT_FILTERS = ["all", "manual", "image", "unverified"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export function isProductFilter(value: string | undefined): value is ProductFilter {
  return value !== undefined && (PRODUCT_FILTERS as readonly string[]).includes(value);
}

/** Shared by GET /api/products and the Products Server Component. */
export async function getProducts(q: string | undefined, filter: ProductFilter) {
  const conditions = [isNull(products.archivedAt)];
  if (filter === "manual" || filter === "image") {
    conditions.push(eq(products.source, filter));
  } else if (filter === "unverified") {
    conditions.push(eq(products.isVerified, false));
  }

  if (q) {
    // pg_trgm's default 0.3 similarity threshold (the % operator) rejects
    // short/single-word queries against longer product names even when the
    // word is an exact substring match (e.g. "טונה" vs "נתחי טונה בהירה
    // בשמן" scores ~0.25) — fall back to a plain substring match so any
    // partial-word search still finds the product.
    conditions.push(sql`(${products.name} % ${q} OR ${products.name} ILIKE ${"%" + q + "%"})`);
  }

  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(q ? desc(sql`similarity(${products.name}, ${q})`) : asc(products.name))
    .limit(50);
}
