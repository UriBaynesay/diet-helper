"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldHint } from "@/components/field-hint";
import { IngredientRow, type IngredientRowValue } from "@/components/meals/ingredient-row";
import { strings } from "@/lib/strings";

export type MealFormValues = {
  name: string;
  ingredients: IngredientRowValue[];
};

const EMPTY_VALUES: MealFormValues = {
  name: "",
  ingredients: [],
};

let keyCounter = 0;
function newIngredient(): IngredientRowValue {
  keyCounter += 1;
  return { key: `new-${keyCounter}`, productId: "", productName: "", quantityG: "" };
}

function toPayload(values: MealFormValues) {
  return {
    name: values.name.trim(),
    ingredients: values.ingredients
      .filter((i) => i.productId && i.quantityG.trim())
      .map((i) => ({ productId: i.productId, quantityG: Number(i.quantityG) })),
  };
}

type ParsedIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  estimatedQuantityG: number | null;
};

type ParseResult = {
  name: string | null;
  ingredients: ParsedIngredient[];
};

function ingredientLineText(i: ParsedIngredient): string {
  const parts = [i.quantity, i.unit, i.name].filter((p) => p !== null && p !== "");
  return parts.join(" ");
}

export function MealFormDialog({
  trigger,
  mealId,
  initialValues,
}: {
  trigger: ReactNode;
  mealId?: string;
  initialValues?: MealFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "paste">("manual");
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [values, setValues] = useState<MealFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isParsing, startParsing] = useTransition();

  function updateIngredient(key: string, next: IngredientRowValue) {
    setValues((v) => ({
      ...v,
      ingredients: v.ingredients.map((i) => (i.key === key ? next : i)),
    }));
  }

  function removeIngredient(key: string) {
    setValues((v) => ({ ...v, ingredients: v.ingredients.filter((i) => i.key !== key) }));
  }

  function addIngredient() {
    setValues((v) => ({ ...v, ingredients: [...v.ingredients, newIngredient()] }));
  }

  function handleParse() {
    if (!pasteText.trim()) return;
    startParsing(async () => {
      setParseError(null);
      const res = await fetch("/api/meals/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      if (!res.ok) {
        setParseError(strings.extraction.failed);
        return;
      }
      const { data } = await res.json();
      const parsed: ParseResult = data.parsed;

      setValues({
        name: parsed.name ?? "",
        // Every parsed ingredient starts fully unmatched — productId is
        // deliberately empty. The model never sees the product library, so
        // it can't and shouldn't guess a match; the user resolves each one
        // via the same search used for manual entry.
        ingredients: parsed.ingredients.map((i) => {
          keyCounter += 1;
          return {
            key: `parsed-${keyCounter}`,
            productId: "",
            productName: "",
            quantityG: i.estimatedQuantityG?.toString() ?? "",
            parsedText: ingredientLineText(i),
          };
        }),
      });
      setMode("manual");
    });
  }

  function handleSubmit() {
    const payload = toPayload(values);
    if (!payload.name || payload.ingredients.length === 0) return;

    startTransition(async () => {
      const res = await fetch(mealId ? `/api/meals/${mealId}` : "/api/meals", {
        method: mealId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error: err } = await res.json();
        setError(
          err?.code === "not_found"
            ? strings.meals.productNotFoundError
            : strings.common.genericError
        );
        return;
      }
      setOpen(false);
      setError(null);
      if (!mealId) {
        setValues(EMPTY_VALUES);
        setPasteText("");
        setMode("manual");
      }
      router.refresh();
    });
  }

  const hasValidIngredient = values.ingredients.some((i) => i.productId && i.quantityG.trim());
  const hasUnmatchedIngredient = values.ingredients.some((i) => !i.productId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
        if (next && !mealId) {
          setValues(EMPTY_VALUES);
          setPasteText("");
          setParseError(null);
          setMode("manual");
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mealId ? strings.meals.editMeal : strings.meals.newMeal}</DialogTitle>
        </DialogHeader>

        {!mealId && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              {strings.meals.modeManual}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "paste" ? "default" : "outline"}
              onClick={() => setMode("paste")}
            >
              {strings.meals.modePaste}
            </Button>
          </div>
        )}

        {mode === "paste" && !mealId ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="items-center gap-1">
                {strings.meals.pasteLabel}
                <FieldHint text={strings.meals.pasteHint} />
              </Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={strings.meals.pastePlaceholder}
                rows={10}
              />
            </div>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            <Button onClick={handleParse} disabled={!pasteText.trim() || isParsing}>
              {isParsing ? strings.extraction.processing : strings.meals.parseButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{strings.meals.nameLabel}</Label>
              <Input
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Label>{strings.meals.ingredientsLabel}</Label>
                <FieldHint text={strings.meals.ingredientsHint} />
              </div>
              {hasUnmatchedIngredient && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {strings.meals.parsedIngredientsNotice}
                </p>
              )}
              {values.ingredients.map((ingredient) => (
                <IngredientRow
                  key={ingredient.key}
                  value={ingredient}
                  onChange={(next) => updateIngredient(ingredient.key, next)}
                  onRemove={() => removeIngredient(ingredient.key)}
                />
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="size-4" />
                {strings.meals.addIngredient}
              </Button>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {(mode === "manual" || mealId) && (
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!values.name.trim() || !hasValidIngredient || isPending}
            >
              {isPending ? strings.common.saving : strings.meals.submit}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
