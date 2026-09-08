"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { showToast } from "@/lib/toast";

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

/**
 * Bottom sheet, two-step (search -> quantity) per the UI redesign handoff.
 * All logic (debounced search, AbortController, product-only search,
 * quantity default/validation, submit/error handling) is unchanged from
 * the prior Dialog-based version — this is a visual/structural rebuild,
 * not new behavior.
 */
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
        showToast(strings.addFood.addedToast);
      } else {
        setError(strings.common.genericError);
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={strings.today.addFood}
            className="fixed bottom-28 start-5 z-30 flex size-14 items-center justify-center rounded-full text-white shadow-lg"
            style={{
              background: "var(--accent-coral)",
              boxShadow: "0 8px 20px oklch(0.62 0.18 25 / 35%)",
            }}
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
        }
      />
      <SheetContent
        side="bottom"
        className="max-h-[82%] rounded-t-[24px] p-0"
        showCloseButton={false}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{strings.addFood.title}</SheetTitle>
        </SheetHeader>

        {!selected ? (
          <div className="flex max-h-[82vh] flex-col">
            <div className="flex shrink-0 items-center justify-between p-4 pb-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm"
                style={{ color: "var(--ink-muted)" }}
              >
                {strings.common.cancel}
              </button>
              <p className="font-display text-[16px] font-bold">{strings.addFood.title}</p>
              <div className="w-10" />
            </div>

            <div className="shrink-0 px-4 pb-2">
              <Label htmlFor="product-search" className="sr-only items-center gap-1">
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
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {query.trim() &&
                (results.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
                    {strings.addFood.noResults}
                  </p>
                ) : (
                  results.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelected(product);
                        setQuery(product.name);
                      }}
                      className="flex w-full items-center justify-between gap-2.5 border-b py-3 text-start"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{product.name}</div>
                        <div dir="ltr" className="text-xs" style={{ color: "var(--ink-muted)" }}>
                          {Math.round(Number(product.kcalPer100g))} kcal / 100g
                        </div>
                      </div>
                      <ChevronLeft className="size-4 shrink-0" style={{ color: "var(--ink-muted)" }} />
                    </button>
                  ))
                ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 overflow-y-auto p-4 pt-6 pb-8">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelected(null)} className="p-1">
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </button>
              <p className="text-[15px] font-bold">{selected.name}</p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
                {strings.addFood.mealLabel}
              </p>
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

            <div className="flex flex-col gap-2">
              <p className="text-[12.5px] font-bold" style={{ color: "var(--ink-muted)" }}>
                {strings.addFood.quantityLabel}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantityG((q) => String(Math.max(1, Number(q || 0) - 10)))}
                  className="flex size-10 items-center justify-center rounded-xl text-xl"
                  style={{ background: "var(--muted)" }}
                >
                  –
                </button>
                <Input
                  id="quantity"
                  type="number"
                  dir="ltr"
                  min="1"
                  step="1"
                  value={quantityG}
                  onChange={(e) => setQuantityG(e.target.value)}
                  className="font-display flex-1 border-0 bg-transparent text-center text-[22px] font-extrabold shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantityG((q) => String(Number(q || 0) + 10))}
                  className="flex size-10 items-center justify-center rounded-xl text-xl"
                  style={{ background: "var(--muted)" }}
                >
                  +
                </button>
              </div>
            </div>

            {selected && (
              <div className="flex items-center justify-between rounded-2xl border p-3.5 text-sm">
                <span dir="ltr">
                  {Math.round(
                    (Number(selected.kcalPer100g) * Number(quantityG || 0)) / 100
                  )}{" "}
                  קל&apos;
                </span>
                <span dir="ltr" style={{ color: "var(--ink-muted)" }}>
                  {Math.round((Number(selected.proteinPer100g) * Number(quantityG || 0)) / 100)}P{" "}
                  {Math.round((Number(selected.carbsPer100g) * Number(quantityG || 0)) / 100)}C{" "}
                  {Math.round((Number(selected.fatPer100g) * Number(quantityG || 0)) / 100)}F
                </span>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="h-12 rounded-2xl text-[15px] font-bold"
              style={{ background: "var(--accent-coral)" }}
            >
              {isPending ? strings.common.saving : strings.addFood.submit}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
