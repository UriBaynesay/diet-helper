import { eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, products, meals } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { diaryEntryInputSchema, isProductEntry } from "@/lib/diary/schema";
import { macrosForQuantity } from "@/lib/diary/macros";
import { getDiaryDay } from "@/lib/diary/get-day";
import { getMealDetail } from "@/lib/meals/get-meal-detail";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return apiError("validation_error", "date query param (YYYY-MM-DD) is required", 400);
  }

  const day = await getDiaryDay(user.userId, date);
  return apiData(day);
}

export async function POST(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsed = diaryEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  if (isProductEntry(input)) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, input.productId),
    });
    if (!product || product.archivedAt) {
      return apiError("not_found", "Product not found", 404);
    }

    const macros = macrosForQuantity(product, input.quantityG);

    const [row] = await db
      .insert(diaryEntries)
      .values({
        userId: user.userId,
        entryDate: new Date(input.entryDate),
        mealType: input.mealType,
        productId: input.productId,
        quantityG: input.quantityG.toString(),
        kcal: macros.kcal.toString(),
        proteinG: macros.proteinG.toString(),
        carbsG: macros.carbsG.toString(),
        fatG: macros.fatG.toString(),
      })
      .returning();

    return apiData({ entry: row }, { status: 201 });
  }

  const meal = await db.query.meals.findFirst({ where: eq(meals.id, input.mealId) });
  if (!meal) {
    return apiError("not_found", "Meal not found", 404);
  }

  // No per-serving scaling — a meal has one fixed total, the literal sum of
  // its ingredients (get-meal-detail.ts's nutrition computation, reused
  // here rather than duplicated).
  const detail = await getMealDetail(input.mealId);
  if (!detail) {
    return apiError("not_found", "Meal not found", 404);
  }
  const macros = detail.nutrition;

  const [row] = await db
    .insert(diaryEntries)
    .values({
      userId: user.userId,
      entryDate: new Date(input.entryDate),
      mealType: input.mealType,
      mealId: input.mealId,
      kcal: macros.kcal.toString(),
      proteinG: macros.proteinG.toString(),
      carbsG: macros.carbsG.toString(),
      fatG: macros.fatG.toString(),
    })
    .returning();

  return apiData({ entry: row }, { status: 201 });
}
