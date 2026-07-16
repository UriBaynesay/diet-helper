"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

type Product = { id: string; name: string };

export type IngredientRowValue = {
  key: string;
  productId: string;
  productName: string;
  quantityG: string;
};

export function IngredientRow({
  value,
  onChange,
  onRemove,
}: {
  value: IngredientRowValue;
  onChange: (next: IngredientRowValue) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState(value.productName);
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !query.trim() || query === value.productName) {
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
        // ignore aborted/failed searches
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open, value.productName]);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onChange({ ...value, productId: "", productName: "" });
            }}
            placeholder={strings.recipes.ingredientSearchPlaceholder}
          />
          {open && results.length > 0 && (
            <div className="absolute z-10 mt-1 flex w-full max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border bg-white p-1 shadow-md dark:bg-neutral-900">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onChange({ ...value, productId: product.id, productName: product.name });
                    setQuery(product.name);
                    setResults([]);
                    setOpen(false);
                  }}
                  className="rounded-md p-1.5 text-start text-sm hover:bg-accent"
                >
                  {product.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          dir="ltr"
          type="number"
          className="w-24"
          placeholder={strings.recipes.ingredientQuantityLabel}
          value={value.quantityG}
          onChange={(e) => onChange({ ...value, quantityG: e.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={strings.recipes.removeIngredient}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
