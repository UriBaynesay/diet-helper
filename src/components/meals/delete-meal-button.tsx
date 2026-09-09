"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export function DeleteMealButton({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/meals/${mealId}`, { method: "DELETE" });
      if (res.status === 409) {
        setError(strings.meals.deleteBlocked);
        return;
      }
      if (res.ok) {
        router.push("/meals");
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => open && setError(null)}>
      <AlertDialogTrigger render={<Button variant="outline" disabled={isPending} className="rounded-xl" />}>
        <Trash2 className="size-4" />
        {strings.meals.deleteMeal}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[20px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{strings.meals.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.meals.deleteConfirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">{strings.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-xl"
            style={{ background: "var(--destructive)" }}
          >
            {strings.meals.deleteMeal}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
