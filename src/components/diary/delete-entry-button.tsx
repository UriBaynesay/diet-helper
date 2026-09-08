"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export function DeleteEntryButton({ entryId }: { entryId: string; date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/diary/${entryId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {error && <span className="text-xs text-destructive">{strings.common.genericError}</span>}
      <Button
        variant="ghost"
        aria-label={strings.today.delete}
        disabled={isPending}
        onClick={handleDelete}
        className="size-[26px] rounded-full"
        style={{ background: "var(--muted)" }}
      >
        <X className="size-[11px]" strokeWidth={1.6} style={{ color: "var(--ink-muted)" }} />
      </Button>
    </div>
  );
}
