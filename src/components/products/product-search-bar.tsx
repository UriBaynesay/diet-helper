"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { strings } from "@/lib/strings";

const FILTERS = ["all", "manual", "image", "unverified"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: strings.products.filterAll,
  manual: strings.products.filterManual,
  image: strings.products.filterImage,
  unverified: strings.products.filterUnverified,
};

export function ProductSearchBar({ q, filter }: { q: string; filter: Filter }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(q);

  useEffect(() => {
    setValue(q);
  }, [q]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value === q) return;
      const params = new URLSearchParams(searchParams);
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      router.push(`/products?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function setFilter(next: Filter) {
    const params = new URLSearchParams(searchParams);
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={strings.products.searchPlaceholder}
        className="rounded-xl"
      />
      <div className="flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold"
              style={
                active
                  ? {
                      borderColor: "var(--accent-coral)",
                      background: "var(--accent-coral)",
                      color: "white",
                    }
                  : {
                      borderColor: "var(--border)",
                      background: "var(--card)",
                      color: "var(--ink-mid)",
                    }
              }
            >
              {FILTER_LABELS[f]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
