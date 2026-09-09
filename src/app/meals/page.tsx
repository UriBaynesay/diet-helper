import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMeals } from "@/lib/meals/get-meals";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { MealListItem } from "@/components/meals/meal-list-item";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";

export default async function MealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const meals = await getMeals();

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{strings.meals.title}</h1>
          <MealFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {strings.meals.addMeal}
              </Button>
            }
          />
        </div>

        {meals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{strings.meals.noResults}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {meals.map((meal) => (
              <MealListItem key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
