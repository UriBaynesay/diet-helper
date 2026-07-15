import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeIngredients, unitConversions } from "@/db/schema";
import { fetchSpoonacularRecipes, type SpoonacularRecipe } from "./spoonacular";
import { resolveUnitToGrams, quantityToGrams } from "./unit-conversion";
import { matchIngredientToProduct } from "./match-product";
import { promoteRecipeIfReady } from "./promote-recipe";

export type IngestResult = {
  recipesFound: number;
  recipesCreated: number;
  recipesSkipped: number;
};

async function insertIngredientsForRecipe(recipeId: string, spoonacular: SpoonacularRecipe) {
  const allConversions = (await db.select().from(unitConversions)).map((c) => ({
    unit: c.unit,
    ingredientPattern: c.ingredientPattern,
    grams: Number(c.grams),
  }));

  for (const ingredient of spoonacular.extendedIngredients) {
    const conversion = resolveUnitToGrams(ingredient.unit, ingredient.name, allConversions);
    const match = await matchIngredientToProduct(ingredient.name);

    const quantityG =
      conversion.status === "resolved"
        ? quantityToGrams(ingredient.amount, conversion.grams)
        : null;

    await db.insert(recipeIngredients).values({
      recipeId,
      productId: match.productId,
      quantityG: quantityG?.toString(),
      rawText: `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`.trim(),
      parsedQuantity: ingredient.amount.toString(),
      parsedUnit: ingredient.unit || null,
      parsedName: ingredient.name,
      matchConfidence: match.confidence,
    });
  }
}

export async function runSpoonacularIngest(params: {
  pageSize: number;
  offset: number;
}): Promise<IngestResult> {
  const fetched = await fetchSpoonacularRecipes({ number: params.pageSize, offset: params.offset });

  let created = 0;
  let skipped = 0;

  for (const spoonacularRecipe of fetched) {
    const externalId = `spoonacular:${spoonacularRecipe.id}`;

    const existing = await db.query.recipes.findFirst({
      where: eq(recipes.externalId, externalId),
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const [recipe] = await db
      .insert(recipes)
      .values({
        name: spoonacularRecipe.title,
        instructions: spoonacularRecipe.instructions,
        servings: spoonacularRecipe.servings || 1,
        prepMinutes: spoonacularRecipe.readyInMinutes || null,
        imageUrl: spoonacularRecipe.image,
        source: "ingested",
        sourceName: "spoonacular",
        sourceUrl: spoonacularRecipe.sourceUrl,
        externalId,
        status: "draft",
      })
      .returning();

    await insertIngredientsForRecipe(recipe.id, spoonacularRecipe);
    await promoteRecipeIfReady(recipe.id);

    created += 1;
  }

  return { recipesFound: fetched.length, recipesCreated: created, recipesSkipped: skipped };
}
