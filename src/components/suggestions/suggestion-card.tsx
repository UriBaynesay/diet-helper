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
  recipeId: string;
  recipeName: string;
  servingsMultiplier: number;
  macros: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  reason: string;
};

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [logged, setLogged] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLog() {
    startTransition(async () => {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: todayIso(),
          mealType,
          recipeId: suggestion.recipeId,
          servings: suggestion.servingsMultiplier,
        }),
      });
      if (res.ok) {
        setLogged(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Link href={`/recipes/${suggestion.recipeId}`} className="font-medium hover:underline">
        {suggestion.recipeName}
      </Link>
      <span dir="ltr" className="text-xs text-muted-foreground">
        {suggestion.servingsMultiplier} {strings.suggestionsScreen.servingsLabel} ·{" "}
        {Math.round(suggestion.macros.kcal)} kcal · {Math.round(suggestion.macros.proteinG)}P{" "}
        {Math.round(suggestion.macros.carbsG)}C {Math.round(suggestion.macros.fatG)}F
      </span>
      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>

      <div className="flex items-center gap-2">
        <Select value={mealType} onValueChange={(v) => v && setMealType(v as MealType)}>
          <SelectTrigger className="flex-1">
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
        <Button size="sm" onClick={handleLog} disabled={isPending || logged}>
          {strings.suggestionsScreen.logThis}
        </Button>
      </div>
      {logged && (
        <p className="text-center text-xs text-muted-foreground">{strings.suggestionsScreen.logSuccess}</p>
      )}
    </div>
  );
}
