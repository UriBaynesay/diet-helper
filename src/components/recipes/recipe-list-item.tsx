import Link from "next/link";
import { strings } from "@/lib/strings";

type Recipe = {
  id: string;
  name: string;
  servings: number;
  prepMinutes: number | null;
};

export function RecipeListItem({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{recipe.name}</span>
        <span dir="ltr" className="text-xs text-muted-foreground">
          {recipe.servings} {strings.recipes.servingsCount}
          {recipe.prepMinutes !== null && ` · ${recipe.prepMinutes} ${strings.recipes.minutes}`}
        </span>
      </div>
    </Link>
  );
}
