import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRecipes, isRecipeStatus } from "@/lib/recipes/get-recipes";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { AppNav } from "@/components/app-nav";
import { RecipeListItem } from "@/components/recipes/recipe-list-item";
import { RecipeFormDialog } from "@/components/recipes/recipe-form-dialog";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { status: statusParam } = await searchParams;
  const status = isRecipeStatus(statusParam) ? statusParam : undefined;

  const recipes = await getRecipes(status);

  return (
    <>
      <AppNav active="recipes" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{strings.recipes.title}</h1>
          <RecipeFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {strings.recipes.addRecipe}
              </Button>
            }
          />
        </div>

        {recipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{strings.recipes.noResults}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recipes.map((recipe) => (
              <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
