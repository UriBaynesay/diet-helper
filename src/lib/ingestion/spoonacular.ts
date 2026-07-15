import { env } from "@/lib/env";

const BASE_URL = "https://api.spoonacular.com";

export type SpoonacularIngredient = {
  id: number;
  name: string;
  amount: number;
  unit: string;
};

export type SpoonacularRecipe = {
  id: number;
  title: string;
  image: string | null;
  sourceUrl: string;
  servings: number;
  readyInMinutes: number;
  summary: string | null;
  extendedIngredients: SpoonacularIngredient[];
  instructions: string | null;
};

/**
 * Fetches a page of recipes with full ingredient + instruction detail via a
 * single complexSearch call (fillIngredients + addRecipeInformation avoids a
 * second request per recipe, keeping this to one call per ingest page).
 */
export async function fetchSpoonacularRecipes(params: {
  number: number;
  offset: number;
}): Promise<SpoonacularRecipe[]> {
  const url = new URL(`${BASE_URL}/recipes/complexSearch`);
  url.searchParams.set("apiKey", env.SPOONACULAR_API_KEY);
  url.searchParams.set("number", String(params.number));
  url.searchParams.set("offset", String(params.offset));
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("instructionsRequired", "true");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Spoonacular request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { results: SpoonacularRecipe[] };
  return body.results;
}
