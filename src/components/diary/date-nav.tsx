"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDaysIso, formatDateHe, todayIso } from "@/lib/format-date";
import { strings } from "@/lib/strings";

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const isToday = date === todayIso();

  function go(nextDate: string) {
    router.push(`/?date=${nextDate}`);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      {/* "previous day" moves visually backward in time — in RTL that's a
          rightward chevron, since the reading/timeline direction is flipped. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={strings.today.previousDay}
        onClick={() => go(addDaysIso(date, -1))}
      >
        <ChevronRight className="size-4" />
      </Button>

      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{formatDateHe(date)}</span>
        {!isToday && (
          <button
            type="button"
            onClick={() => go(todayIso())}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {strings.today.today}
          </button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={strings.today.nextDay}
        onClick={() => go(addDaysIso(date, 1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  );
}
