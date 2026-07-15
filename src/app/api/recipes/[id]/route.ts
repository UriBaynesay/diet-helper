import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients, recipeNutrition } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { recipeUpdateSchema } from "@/lib/recipes/schema";

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
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!recipe) {
    return apiError("not_found", "Recipe not found", 404);
  }

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id));
  const [nutrition] = await db
    .select()
    .from(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, id));

  return apiData({ recipe, ingredients, nutrition: nutrition ?? null });
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
  const parsed = recipeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const existing = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!existing) {
    return apiError("not_found", "Recipe not found", 404);
  }

  if (input.ingredients) {
    const productIds = [...new Set(input.ingredients.map((i) => i.productId))];
    const foundProducts = await db.query.products.findMany({
      where: (products, { inArray }) => inArray(products.id, productIds),
    });
    if (foundProducts.length !== productIds.length) {
      return apiError("not_found", "One or more ingredient products not found", 404);
    }

    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    await db.insert(recipeIngredients).values(
      input.ingredients.map((ingredient) => ({
        recipeId: id,
        productId: ingredient.productId,
        quantityG: ingredient.quantityG.toString(),
      }))
    );
  }

  const [recipe] = await db
    .update(recipes)
    .set({
      name: input.name,
      description: input.description,
      servings: input.servings,
      instructions: input.instructions,
      prepMinutes: input.prepMinutes,
      tags: input.tags,
      imageUrl: input.imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id))
    .returning();

  return apiData({ recipe });
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
  const existing = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!existing) {
    return apiError("not_found", "Recipe not found", 404);
  }

  try {
    await db.delete(recipes).where(eq(recipes.id, id));
  } catch {
    // FK constraint from diary_entries.recipe_id blocks this — same
    // "can't remove what's referenced" rule the spec applies to products.
    return apiError("in_use", "Recipe is logged in a diary entry and can't be deleted", 409);
  }
  return apiData({ deleted: true });
}
