"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { todayIso } from "@/lib/format-date";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export type Suggestion = {
  mealId: string;
  mealName: string;
  macros: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  reason: string;
};

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLog() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: todayIso(),
          mealType,
          mealId: suggestion.mealId,
        }),
      });
      if (res.ok) {
        setLogged(true);
        router.refresh();
      } else {
        setError(strings.common.genericError);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border bg-card p-3.5" style={{ borderColor: "var(--border)" }}>
      <div>
        <Link href={`/meals/${suggestion.mealId}`} className="text-[15.5px] font-bold hover:underline">
          {suggestion.mealName}
        </Link>
        <div dir="ltr" className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {Math.round(suggestion.macros.kcal)} kcal · {Math.round(suggestion.macros.proteinG)}P{" "}
          {Math.round(suggestion.macros.carbsG)}C {Math.round(suggestion.macros.fatG)}F
        </div>
      </div>
      <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{suggestion.reason}</p>

      <div className="flex items-center gap-2">
        <Select value={mealType} onValueChange={(v) => v && setMealType(v as MealType)}>
          <SelectTrigger className="flex-1 rounded-xl">
            <SelectValue>{strings.mealTypes[mealType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MEAL_TYPES.map((meal) => (
              <SelectItem key={meal} value={meal}>
                {strings.mealTypes[meal]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleLog}
          disabled={isPending || logged}
          className="rounded-xl font-bold text-white"
          style={{ background: "var(--accent-coral)" }}
        >
          {strings.suggestionsScreen.logThis}
        </Button>
      </div>
      {logged && (
        <p className="text-center text-xs" style={{ color: "var(--ink-muted)" }}>
          {strings.suggestionsScreen.logSuccess}
        </p>
      )}
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
