import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealIngredients, diaryEntries } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { mealUpdateSchema } from "@/lib/meals/schema";
import { getMealDetail } from "@/lib/meals/get-meal-detail";

export async function GET(
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
  const detail = await getMealDetail(id);
  if (!detail) {
    return apiError("not_found", "Meal not found", 404);
  }

  return apiData(detail);
}

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
  const parsed = mealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const existing = await db.query.meals.findFirst({ where: eq(meals.id, id) });
  if (!existing) {
    return apiError("not_found", "Meal not found", 404);
  }

  if (input.ingredients) {
    const productIds = [...new Set(input.ingredients.map((i) => i.productId))];
    const foundProducts = await db.query.products.findMany({
      where: (products, { inArray }) => inArray(products.id, productIds),
    });
    if (foundProducts.length !== productIds.length) {
      return apiError("not_found", "One or more ingredient products not found", 404);
    }

    await db.delete(mealIngredients).where(eq(mealIngredients.mealId, id));
    await db.insert(mealIngredients).values(
      input.ingredients.map((ingredient) => ({
        mealId: id,
        productId: ingredient.productId,
        quantityG: ingredient.quantityG.toString(),
      }))
    );
  }

  const [meal] = await db
    .update(meals)
    .set({
      name: input.name,
      updatedAt: new Date(),
    })
    .where(eq(meals.id, id))
    .returning();

  return apiData({ meal });
}

export async function DELETE(
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
  const existing = await db.query.meals.findFirst({ where: eq(meals.id, id) });
  if (!existing) {
    return apiError("not_found", "Meal not found", 404);
  }

  // Explicit precheck rather than attempt-delete-and-catch-any-error: more
  // correct than the prior recipes route's blanket try/catch, which would
  // have translated any DB error during the delete (not just the specific
  // FK violation) into a false "in use" report.
  const referencingEntry = await db.query.diaryEntries.findFirst({
    where: eq(diaryEntries.mealId, id),
  });
  if (referencingEntry) {
    return apiError("in_use", "Meal is logged in a diary entry and can't be deleted", 409);
  }

  await db.delete(meals).where(eq(meals.id, id));
  return apiData({ deleted: true });
}
