import { eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { diaryEntryUpdateSchema } from "@/lib/diary/schema";
import { macrosForQuantity } from "@/lib/diary/macros";

async function loadOwnedEntry(id: string, userId: string) {
  const entry = await db.query.diaryEntries.findFirst({ where: eq(diaryEntries.id, id) });
  if (!entry || entry.userId !== userId) return null;
  return entry;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = diaryEntryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const existing = await loadOwnedEntry(id, user.userId);
  if (!existing) {
    return apiError("not_found", "Diary entry not found", 404);
  }
  if (!existing.productId) {
    return apiError("unsupported", "Recipe-based entries can't be edited yet", 400);
  }

  let macros: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null = null;
  if (input.quantityG !== undefined) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, existing.productId),
    });
    if (!product) {
      return apiError("not_found", "Source product no longer exists", 404);
    }
    macros = macrosForQuantity(product, input.quantityG);
  }

  const [row] = await db
    .update(diaryEntries)
    .set({
      entryDate: input.entryDate ? new Date(input.entryDate) : undefined,
      mealType: input.mealType,
      quantityG: input.quantityG?.toString(),
      kcal: macros?.kcal.toString(),
      proteinG: macros?.proteinG.toString(),
      carbsG: macros?.carbsG.toString(),
      fatG: macros?.fatG.toString(),
      updatedAt: new Date(),
    })
    .where(eq(diaryEntries.id, id))
    .returning();

  return apiData({ entry: row });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { id } = await params;
  const existing = await loadOwnedEntry(id, user.userId);
  if (!existing) {
    return apiError("not_found", "Diary entry not found", 404);
  }

  await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
  return apiData({ deleted: true });
}
