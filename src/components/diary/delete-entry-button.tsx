"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export function DeleteEntryButton({ entryId }: { entryId: string; date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/diary/${entryId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={strings.today.delete}
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
