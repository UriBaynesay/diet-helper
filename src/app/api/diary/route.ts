import { eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, products, recipes, recipeNutrition } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { diaryEntryInputSchema, isProductEntry } from "@/lib/diary/schema";
import { macrosForQuantity } from "@/lib/diary/macros";
import { getDiaryDay } from "@/lib/diary/get-day";

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

  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, input.recipeId) });
  if (!recipe || recipe.status !== "ready") {
    return apiError("not_found", "Recipe not found or not ready", 404);
  }

  const [nutrition] = await db
    .select()
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, input.recipeId));
  if (!nutrition) {
    return apiError("not_found", "Recipe nutrition unavailable", 404);
  }

  const factor = input.servings;
  const macros = {
    kcal: Number(nutrition.kcalPerServing) * factor,
    proteinG: Number(nutrition.proteinGPerServing) * factor,
    carbsG: Number(nutrition.carbsGPerServing) * factor,
    fatG: Number(nutrition.fatGPerServing) * factor,
  };

  const [row] = await db
    .insert(diaryEntries)
    .values({
      userId: user.userId,
      entryDate: new Date(input.entryDate),
      mealType: input.mealType,
      recipeId: input.recipeId,
      servings: input.servings.toString(),
      kcal: macros.kcal.toString(),
      proteinG: macros.proteinG.toString(),
      carbsG: macros.carbsG.toString(),
      fatG: macros.fatG.toString(),
    })
    .returning();

  return apiData({ entry: row }, { status: 201 });
}
