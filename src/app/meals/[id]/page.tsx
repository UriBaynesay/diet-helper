import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
        <Link
          href="/meals"
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: "var(--ink-muted)" }}
        >
          <ChevronRight className="size-4" />
          {strings.meals.title}
        </Link>

        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-[22px] font-extrabold">{meal.name}</h1>
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

        <div className="rounded-[18px] border bg-card p-3.5" style={{ borderColor: "var(--border)" }}>
          <p className="mb-1.5 text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
            {strings.meals.nutritionTitle}
          </p>
          <p dir="ltr" className="text-sm font-semibold">
            {Math.round(nutrition.kcal)} kcal · {Math.round(nutrition.proteinG)}P{" "}
            {Math.round(nutrition.carbsG)}C {Math.round(nutrition.fatG)}F
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
            {strings.meals.ingredientsLabel}
          </p>
          <div className="overflow-hidden rounded-[18px] border bg-card" style={{ borderColor: "var(--border)" }}>
            {ingredients.map((ingredient, i) => (
              <div
                key={ingredient.id}
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${
                  i < ingredients.length - 1 ? "border-b" : ""
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                <span>{ingredient.productName}</span>
                <span dir="ltr" style={{ color: "var(--ink-muted)" }}>
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
