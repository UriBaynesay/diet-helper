import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDiaryDay } from "@/lib/diary/get-day";
import { todayIso } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { DateNav } from "@/components/diary/date-nav";
import { MacroProgress } from "@/components/diary/macro-progress";
import { EntryList } from "@/components/diary/entry-list";
import { AddFoodDialog } from "@/components/diary/add-food-dialog";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayIso();

  const { entries, totals, target } = await getDiaryDay(user.userId, date);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">{strings.today.title}</h1>

      <DateNav date={date} />

      {!target ? (
        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
          {strings.today.noTarget}
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <MacroProgress
            label={strings.today.calories}
            consumed={totals.kcal}
            target={target.kcal}
            unit="kcal"
          />
          <MacroProgress
            label={strings.today.protein}
            consumed={totals.proteinG}
            target={target.proteinG}
            unit="g"
          />
          <MacroProgress
            label={strings.today.carbs}
            consumed={totals.carbsG}
            target={target.carbsG}
            unit="g"
          />
          <MacroProgress
            label={strings.today.fat}
            consumed={totals.fatG}
            target={target.fatG}
            unit="g"
          />
        </div>
      )}

      <div className="flex justify-end">
        <AddFoodDialog date={date} />
      </div>

      <EntryList entries={entries} date={date} />
    </main>
  );
}
