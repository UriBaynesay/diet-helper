import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRecipeDetail } from "@/lib/recipes/get-recipe-detail";
import { strings } from "@/lib/strings";
import { AppNav } from "@/components/app-nav";
import { RecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { Button } from "@/components/ui/button";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const detail = await getRecipeDetail(id);
  if (!detail) notFound();

  const { recipe, ingredients, nutrition } = detail;

  return (
    <>
      <AppNav active="recipes" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4">
        <Link href="/recipes" className="text-sm text-muted-foreground">
          ← {strings.recipes.backToList}
        </Link>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold">{recipe.name}</h1>
          <RecipeFormDialog
            recipeId={recipe.id}
            initialValues={{
              name: recipe.name,
              description: recipe.description ?? "",
              servings: recipe.servings.toString(),
              prepMinutes: recipe.prepMinutes?.toString() ?? "",
              instructions: recipe.instructions ?? "",
              tags: recipe.tags?.join(", ") ?? "",
              ingredients: ingredients.map((i) => ({
                key: i.id,
                productId: i.productId,
                productName: i.productName,
                quantityG: i.quantityG,
              })),
            }}
            trigger={<Button variant="outline" size="sm">{strings.common.save}</Button>}
          />
        </div>

        {recipe.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.description}</p>
        )}

        <div dir="ltr" className="flex gap-4 text-sm text-muted-foreground">
          <span>
            {recipe.servings} {strings.recipes.servingsCount}
          </span>
          {recipe.prepMinutes !== null && (
            <span>
              {recipe.prepMinutes} {strings.recipes.minutes}
            </span>
          )}
        </div>

        {nutrition && (
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">
              {strings.recipes.nutritionTitle} ({strings.recipes.perServing})
            </p>
            <p dir="ltr" className="text-sm text-muted-foreground">
              {Math.round(Number(nutrition.kcalPerServing))} kcal ·{" "}
              {Math.round(Number(nutrition.proteinGPerServing))}P{" "}
              {Math.round(Number(nutrition.carbsGPerServing))}C{" "}
              {Math.round(Number(nutrition.fatGPerServing))}F
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{strings.recipes.ingredientsLabel}</p>
          <div className="flex flex-col gap-1">
            {ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>{ingredient.productName}</span>
                <span dir="ltr" className="text-muted-foreground">
                  {Math.round(Number(ingredient.quantityG))} g
                </span>
              </div>
            ))}
          </div>
        </div>

        {recipe.instructions && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{strings.recipes.instructionsLabel}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.instructions}</p>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted/60 px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        <DeleteRecipeButton recipeId={recipe.id} />
      </main>
    </>
  );
}
