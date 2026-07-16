import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export const PRODUCT_FILTERS = ["all", "manual", "image", "ingested", "unverified"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export function isProductFilter(value: string | undefined): value is ProductFilter {
  return value !== undefined && (PRODUCT_FILTERS as readonly string[]).includes(value);
}

/** Shared by GET /api/products and the Products Server Component. */
export async function getProducts(q: string | undefined, filter: ProductFilter) {
  const conditions = [isNull(products.archivedAt)];
  if (filter === "manual" || filter === "image" || filter === "ingested") {
    conditions.push(eq(products.source, filter));
  } else if (filter === "unverified") {
    conditions.push(eq(products.isVerified, false));
  }

  if (q) {
    conditions.push(sql`${products.name} % ${q}`);
  }

  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(q ? desc(sql`similarity(${products.name}, ${q})`) : asc(products.name))
    .limit(50);
}
