import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDiaryDay } from "@/lib/diary/get-day";
import { todayIso } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { DateNav } from "@/components/diary/date-nav";
import { CalorieRing } from "@/components/diary/calorie-ring";
import { EntryList } from "@/components/diary/entry-list";
import { AddFoodDialog } from "@/components/diary/add-food-dialog";
import { BottomNav } from "@/components/bottom-nav";

const MACRO_ROWS: {
  key: "proteinG" | "carbsG" | "fatG";
  label: string;
  color: string;
}[] = [
  { key: "proteinG", label: strings.today.protein, color: "var(--macro-protein)" },
  { key: "carbsG", label: strings.today.carbs, color: "var(--macro-carbs)" },
  { key: "fatG", label: strings.today.fat, color: "var(--macro-fat)" },
];

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
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <h1 className="font-display text-[26px] font-extrabold">{strings.today.title}</h1>

        <DateNav date={date} />

        {!target ? (
          <p className="rounded-2xl p-3 text-sm" style={{ background: "var(--muted)", color: "var(--ink-muted)" }}>
            {strings.today.noTarget}
          </p>
        ) : (
          <div
            className="flex items-center gap-[18px] rounded-[24px] border bg-card p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <CalorieRing consumed={totals.kcal} target={target.kcal} unitLabel="קל'" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {MACRO_ROWS.map((row) => {
                const consumed = totals[row.key];
                const rowTarget = target[row.key];
                const pct = rowTarget > 0 ? Math.min(100, (consumed / rowTarget) * 100) : 0;
                return (
                  <div key={row.key}>
                    <div className="mb-1.5 flex justify-between text-[12.5px]">
                      <span className="font-semibold">{row.label}</span>
                      <span dir="ltr" style={{ color: "var(--ink-muted)" }}>
                        {Math.round(consumed)} / {Math.round(rowTarget)} g
                      </span>
                    </div>
                    <div
                      className="h-[7px] overflow-hidden rounded"
                      style={{ background: "var(--muted)" }}
                    >
                      <div
                        className="h-full rounded"
                        style={{ width: `${pct}%`, background: row.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <EntryList entries={entries} date={date} />
      </main>
      <AddFoodDialog date={date} />
      <BottomNav />
    </>
  );
}
