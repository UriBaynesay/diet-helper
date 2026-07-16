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
import { IngredientRow, type IngredientRowValue } from "@/components/recipes/ingredient-row";
import { strings } from "@/lib/strings";

export type RecipeFormValues = {
  name: string;
  description: string;
  servings: string;
  prepMinutes: string;
  instructions: string;
  tags: string;
  ingredients: IngredientRowValue[];
};

const EMPTY_VALUES: RecipeFormValues = {
  name: "",
  description: "",
  servings: "1",
  prepMinutes: "",
  instructions: "",
  tags: "",
  ingredients: [],
};

let keyCounter = 0;
function newIngredient(): IngredientRowValue {
  keyCounter += 1;
  return { key: `new-${keyCounter}`, productId: "", productName: "", quantityG: "" };
}

function toPayload(values: RecipeFormValues) {
  const str = (s: string) => (s.trim() === "" ? undefined : s.trim());
  return {
    name: values.name.trim(),
    description: str(values.description) ?? null,
    servings: Number(values.servings),
    prepMinutes: values.prepMinutes.trim() ? Number(values.prepMinutes) : null,
    instructions: str(values.instructions) ?? null,
    tags: values.tags.trim()
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null,
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
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  instructions: string | null;
  ingredients: ParsedIngredient[];
};

function ingredientLineText(i: ParsedIngredient): string {
  const parts = [i.quantity, i.unit, i.name].filter((p) => p !== null && p !== "");
  return parts.join(" ");
}

export function RecipeFormDialog({
  trigger,
  recipeId,
  initialValues,
}: {
  trigger: ReactNode;
  recipeId?: string;
  initialValues?: RecipeFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "paste">("manual");
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [values, setValues] = useState<RecipeFormValues>(initialValues ?? EMPTY_VALUES);
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
      const res = await fetch("/api/recipes/parse", {
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
        description: parsed.description ?? "",
        servings: parsed.servings?.toString() ?? "1",
        prepMinutes: parsed.prepMinutes?.toString() ?? "",
        instructions: parsed.instructions ?? "",
        tags: "",
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
      const res = await fetch(recipeId ? `/api/recipes/${recipeId}` : "/api/recipes", {
        method: recipeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error: err } = await res.json();
        setError(err?.message ?? "error");
        return;
      }
      setOpen(false);
      setError(null);
      if (!recipeId) {
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
        if (next && !recipeId) {
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
          <DialogTitle>
            {recipeId ? strings.recipes.editRecipe : strings.recipes.newRecipe}
          </DialogTitle>
        </DialogHeader>

        {!recipeId && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              {strings.recipes.modeManual}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "paste" ? "default" : "outline"}
              onClick={() => setMode("paste")}
            >
              {strings.recipes.modePaste}
            </Button>
          </div>
        )}

        {mode === "paste" && !recipeId ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="items-center gap-1">
                {strings.recipes.pasteLabel}
                <FieldHint text={strings.recipes.pasteHint} />
              </Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={strings.recipes.pastePlaceholder}
                rows={10}
              />
            </div>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            <Button onClick={handleParse} disabled={!pasteText.trim() || isParsing}>
              {isParsing ? strings.extraction.processing : strings.recipes.parseButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{strings.recipes.nameLabel}</Label>
              <Input
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{strings.recipes.descriptionLabel}</Label>
              <Textarea
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{strings.recipes.servingsLabel}</Label>
                <Input
                  dir="ltr"
                  type="number"
                  value={values.servings}
                  onChange={(e) => setValues((v) => ({ ...v, servings: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{strings.recipes.prepMinutesLabel}</Label>
                <Input
                  dir="ltr"
                  type="number"
                  value={values.prepMinutes}
                  onChange={(e) => setValues((v) => ({ ...v, prepMinutes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{strings.recipes.instructionsLabel}</Label>
              <Textarea
                value={values.instructions}
                onChange={(e) => setValues((v) => ({ ...v, instructions: e.target.value }))}
                rows={5}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="items-center gap-1">
                {strings.recipes.tagsLabel}
                <FieldHint text={strings.recipes.tagsHint} />
              </Label>
              <Input
                value={values.tags}
                onChange={(e) => setValues((v) => ({ ...v, tags: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Label>{strings.recipes.ingredientsLabel}</Label>
                <FieldHint text={strings.recipes.ingredientsHint} />
              </div>
              {hasUnmatchedIngredient && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {strings.recipes.parsedIngredientsNotice}
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
                {strings.recipes.addIngredient}
              </Button>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {(mode === "manual" || recipeId) && (
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!values.name.trim() || !hasValidIngredient || isPending}
            >
              {strings.recipes.submit}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
