"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { strings } from "@/lib/strings";

const FILTERS = ["all", "manual", "image", "ingested", "unverified"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: strings.products.filterAll,
  manual: strings.products.filterManual,
  image: strings.products.filterImage,
  ingested: strings.products.filterIngested,
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

  function setFilter(next: Filter | null) {
    if (!next) return;
    const params = new URLSearchParams(searchParams);
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={strings.products.searchPlaceholder}
        className="flex-1"
      />
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger>
          <SelectValue>{FILTER_LABELS[filter]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FILTERS.map((f) => (
            <SelectItem key={f} value={f}>
              {FILTER_LABELS[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
