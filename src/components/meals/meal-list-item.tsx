import Link from "next/link";

type Meal = {
  id: string;
  name: string;
};

export function MealListItem({ meal }: { meal: Meal }) {
  return (
    <Link
      href={`/meals/${meal.id}`}
      className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent"
    >
      <span className="truncate font-medium">{meal.name}</span>
    </Link>
  );
}
