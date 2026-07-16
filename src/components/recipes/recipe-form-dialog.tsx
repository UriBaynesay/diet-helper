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
  const [values, setValues] = useState<RecipeFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      if (!recipeId) setValues(EMPTY_VALUES);
      router.refresh();
    });
  }

  const hasValidIngredient = values.ingredients.some((i) => i.productId && i.quantityG.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
        if (next && !recipeId) setValues(EMPTY_VALUES);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recipeId ? strings.recipes.editRecipe : strings.recipes.newRecipe}
          </DialogTitle>
        </DialogHeader>

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
            <Input
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
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
            <Input
              value={values.instructions}
              onChange={(e) => setValues((v) => ({ ...v, instructions: e.target.value }))}
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

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!values.name.trim() || !hasValidIngredient || isPending}
          >
            {strings.recipes.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
