import { db } from "@/db";
import { meals, mealIngredients } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { mealInputSchema } from "@/lib/meals/schema";
import { getMeals } from "@/lib/meals/get-meals";
import { getMealDetail } from "@/lib/meals/get-meal-detail";

export async function GET(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const rows = await getMeals();
  return apiData(rows);
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
  const parsed = mealInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const productIds = [...new Set(input.ingredients.map((i) => i.productId))];
  const foundProducts = await db.query.products.findMany({
    where: (products, { inArray: inArrayOp }) => inArrayOp(products.id, productIds),
  });
  if (foundProducts.length !== productIds.length) {
    return apiError("not_found", "One or more ingredient products not found", 404);
  }

  const [meal] = await db
    .insert(meals)
    .values({
      createdBy: user.userId,
      name: input.name,
    })
    .returning();

  await db.insert(mealIngredients).values(
    input.ingredients.map((ingredient) => ({
      mealId: meal.id,
      productId: ingredient.productId,
      quantityG: ingredient.quantityG.toString(),
    }))
  );

  // Compute total nutrition the same way get-meal-detail.ts does — sum
  // macrosForQuantity across ingredients, no stored/view nutrition.
  const detail = await getMealDetail(meal.id);

  return apiData({ meal, nutrition: detail?.nutrition ?? null }, { status: 201 });
}
