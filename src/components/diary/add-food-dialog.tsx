"use client";

import { useEffect, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldHint } from "@/components/field-hint";
import { strings } from "@/lib/strings";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function AddFoodDialog({ date }: { date: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantityG, setQuantityG] = useState("100");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { data } = await res.json();
        setResults(data);
      } catch {
        // ignore aborted/failed searches — user is still typing
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setQuantityG("100");
    setMealType("breakfast");
    setError(null);
  }

  function handleSubmit() {
    if (!selected) return;
    const qty = Number(quantityG);
    if (!Number.isFinite(qty) || qty <= 0) return;

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: date,
          mealType,
          productId: selected.id,
          quantityG: qty,
        }),
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(strings.common.genericError);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            {strings.today.addFood}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{strings.addFood.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-search" className="items-center gap-1">
              {strings.addFood.searchPlaceholder}
              <FieldHint text={strings.addFood.searchHint} />
            </Label>
            <Input
              id="product-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder={strings.addFood.searchPlaceholder}
              autoFocus
            />
            {query.trim() && !selected && (
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border p-1">
                {results.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">{strings.addFood.noResults}</p>
                ) : (
                  results.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelected(product);
                        setQuery(product.name);
                      }}
                      className="flex flex-col items-start rounded-md p-2 text-start text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">{product.name}</span>
                      <span dir="ltr" className="text-xs text-muted-foreground">
                        {Math.round(Number(product.kcalPer100g))} kcal / 100g
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">{strings.addFood.quantityLabel}</Label>
            <Input
              id="quantity"
              type="number"
              dir="ltr"
              min="1"
              step="1"
              value={quantityG}
              onChange={(e) => setQuantityG(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="meal-type">{strings.addFood.mealLabel}</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger id="meal-type" className="w-full">
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
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!selected || isPending}
          >
            {isPending ? strings.common.saving : strings.addFood.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
