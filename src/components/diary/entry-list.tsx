import type { DiaryDayEntry } from "@/lib/diary/get-day";
import { strings } from "@/lib/strings";
import { DeleteEntryButton } from "@/components/diary/delete-entry-button";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

export function EntryList({ entries, date: _date }: { entries: DiaryDayEntry[]; date: string }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
        {strings.today.noEntries}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {MEAL_ORDER.map((meal) => {
        const mealEntries = entries.filter((e) => e.mealType === meal);
        if (mealEntries.length === 0) return null;

        return (
          <div key={meal} className="mt-[22px] first:mt-0">
            <h3 className="mb-2 text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
              {strings.mealTypes[meal]}
            </h3>
            <div
              className="overflow-hidden rounded-[18px] border bg-card"
              style={{ borderColor: "var(--border)" }}
            >
              {mealEntries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2.5 p-3.5 ${
                    i < mealEntries.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold">{entry.name}</div>
                    {entry.quantityG && (
                      <div dir="ltr" className="mt-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                        {Math.round(Number(entry.quantityG))} g
                      </div>
                    )}
                  </div>
                  <div
                    dir="ltr"
                    className="shrink-0 text-[13.5px] font-bold"
                    style={{ color: "var(--accent-coral)" }}
                  >
                    {Math.round(entry.kcal)} kcal
                  </div>
                  <DeleteEntryButton entryId={entry.id} date={_date} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
