import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { id } = await params;
  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) {
    return apiError("not_found", "Product not found", 404);
  }

  const [row] = await db
    .update(products)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return apiData({ product: row });
}
