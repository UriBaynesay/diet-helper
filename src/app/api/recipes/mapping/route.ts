import { eq, or, and } from "drizzle-orm";
import { db } from "@/db";
import { recipeIngredients, products } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { mappingInputSchema } from "@/lib/ingestion/mapping-schema";
import { promoteRecipeIfReady } from "@/lib/ingestion/promote-recipe";

export async function POST(request: Request) {
  try {
    requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsed = mappingInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const matchingRows = await db
    .select()
    .from(recipeIngredients)
    .where(
      and(
        eq(recipeIngredients.parsedName, input.ingredientName),
        or(
          eq(recipeIngredients.matchConfidence, "unmatched"),
          eq(recipeIngredients.matchConfidence, "low"),
          eq(recipeIngredients.matchConfidence, "medium")
        )
      )
    );

  if (input.action === "link") {
    if (!input.productId) {
      return apiError("validation_error", "productId is required for action=link", 400);
    }
    const product = await db.query.products.findFirst({ where: eq(products.id, input.productId) });
    if (!product) {
      return apiError("not_found", "Product not found", 404);
    }

    for (const row of matchingRows) {
      await db
        .update(recipeIngredients)
        .set({
          productId: input.productId,
          // A human-confirmed mapping is always high confidence — this is
          // exactly the review step the queue exists for.
          matchConfidence: "high",
          quantityG: row.quantityG ?? "0",
          updatedAt: new Date(),
        })
        .where(eq(recipeIngredients.id, row.id));
    }
  } else {
    // Ignorable: real ingredient, contributes nothing (spec §11.2 step 5) —
    // 0g with high confidence, same treatment as an unresolvable quantity.
    for (const row of matchingRows) {
      await db
        .update(recipeIngredients)
        .set({ quantityG: "0", matchConfidence: "high", updatedAt: new Date() })
        .where(eq(recipeIngredients.id, row.id));
    }
  }

  const recipeIds = [...new Set(matchingRows.map((r) => r.recipeId))];
  for (const recipeId of recipeIds) {
    await promoteRecipeIfReady(recipeId);
  }

  return apiData({ updated: matchingRows.length, recipeIds });
}
