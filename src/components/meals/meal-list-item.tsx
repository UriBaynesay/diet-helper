import Link from "next/link";

type Meal = {
  id: string;
  name: string;
  nutrition: { kcal: number; proteinG: number; carbsG: number; fatG: number };
};

export function MealListItem({ meal }: { meal: Meal }) {
  return (
    <Link
      href={`/meals/${meal.id}`}
      className="block rounded-[18px] border bg-card p-3.5"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-[15.5px] font-bold">{meal.name}</span>
      <div dir="ltr" className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
        {Math.round(meal.nutrition.kcal)} kcal · {Math.round(meal.nutrition.proteinG)}P{" "}
        {Math.round(meal.nutrition.carbsG)}C {Math.round(meal.nutrition.fatG)}F
      </div>
    </Link>
  );
}
