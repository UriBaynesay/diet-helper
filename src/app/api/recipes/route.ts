import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients, recipeNutrition } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { recipeInputSchema } from "@/lib/recipes/schema";
import { getRecipes } from "@/lib/recipes/get-recipes";

export async function GET(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const rows = await getRecipes();
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
  const parsed = recipeInputSchema.safeParse(body);
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

  const [recipe] = await db
    .insert(recipes)
    .values({
      createdBy: user.userId,
      name: input.name,
      description: input.description,
      servings: input.servings,
      instructions: input.instructions,
      prepMinutes: input.prepMinutes,
      tags: input.tags,
      imageUrl: input.imageUrl,
    })
    .returning();

  await db.insert(recipeIngredients).values(
    input.ingredients.map((ingredient) => ({
      recipeId: recipe.id,
      productId: ingredient.productId,
      quantityG: ingredient.quantityG.toString(),
    }))
  );

  const [nutrition] = await db
    .select()
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, recipe.id));

  return apiData({ recipe, nutrition: nutrition ?? null }, { status: 201 });
}
