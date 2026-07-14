import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { productUpdateSchema, kcalSanityWarning } from "@/lib/products/schema";

export async function PATCH(
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
  const body = await request.json();
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }

  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) {
    return apiError("not_found", "Product not found", 404);
  }

  const input = parsed.data;
  const merged = {
    kcalPer100g: input.kcalPer100g ?? Number(existing.kcalPer100g),
    proteinPer100g: input.proteinPer100g ?? Number(existing.proteinPer100g),
    carbsPer100g: input.carbsPer100g ?? Number(existing.carbsPer100g),
    fatPer100g: input.fatPer100g ?? Number(existing.fatPer100g),
  };
  const warning = kcalSanityWarning(merged);

  const [row] = await db
    .update(products)
    .set({
      ...input,
      servingSizeG: input.servingSizeG?.toString(),
      kcalPer100g: input.kcalPer100g?.toString(),
      proteinPer100g: input.proteinPer100g?.toString(),
      carbsPer100g: input.carbsPer100g?.toString(),
      fatPer100g: input.fatPer100g?.toString(),
      fiberPer100g: input.fiberPer100g?.toString(),
      sugarPer100g: input.sugarPer100g?.toString(),
      sodiumMgPer100g: input.sodiumMgPer100g?.toString(),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  return apiData({ product: row, warning });
}
