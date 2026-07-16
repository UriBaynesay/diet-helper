import type { DiaryDayEntry } from "@/lib/diary/get-day";
import { strings } from "@/lib/strings";
import { DeleteEntryButton } from "@/components/diary/delete-entry-button";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

export function EntryList({ entries, date }: { entries: DiaryDayEntry[]; date: string }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{strings.today.noEntries}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {MEAL_ORDER.map((meal) => {
        const mealEntries = entries.filter((e) => e.mealType === meal);
        if (mealEntries.length === 0) return null;

        return (
          <div key={meal} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {strings.mealTypes[meal]}
            </h3>
            <div className="flex flex-col gap-1.5">
              {mealEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{entry.name}</span>
                    <span dir="ltr" className="text-xs text-muted-foreground">
                      {entry.quantityG
                        ? `${Math.round(Number(entry.quantityG))} g`
                        : `${entry.servings} servings`}
                      {" · "}
                      {Math.round(entry.kcal)} kcal
                    </span>
                  </div>
                  <DeleteEntryButton entryId={entry.id} date={date} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
