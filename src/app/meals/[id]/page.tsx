import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMealDetail } from "@/lib/meals/get-meal-detail";
import { strings } from "@/lib/strings";
import { BottomNav } from "@/components/bottom-nav";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { DeleteMealButton } from "@/components/meals/delete-meal-button";
import { Button } from "@/components/ui/button";

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const detail = await getMealDetail(id);
  if (!detail) notFound();

  const { meal, ingredients, nutrition } = detail;

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <Link href="/meals" className="text-sm text-muted-foreground">
          ← {strings.meals.backToList}
        </Link>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold">{meal.name}</h1>
          <MealFormDialog
            mealId={meal.id}
            initialValues={{
              name: meal.name,
              ingredients: ingredients.map((i) => ({
                key: i.id,
                productId: i.productId,
                productName: i.productName,
                quantityG: i.quantityG,
              })),
            }}
            trigger={<Button variant="outline" size="sm">{strings.meals.editMeal}</Button>}
          />
        </div>

        <div className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">{strings.meals.nutritionTitle}</p>
          <p dir="ltr" className="text-sm text-muted-foreground">
            {Math.round(nutrition.kcal)} kcal · {Math.round(nutrition.proteinG)}P{" "}
            {Math.round(nutrition.carbsG)}C {Math.round(nutrition.fatG)}F
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{strings.meals.ingredientsLabel}</p>
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

        <DeleteMealButton mealId={meal.id} />
      </main>
      <BottomNav />
    </>
  );
}
