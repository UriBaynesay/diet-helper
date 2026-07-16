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

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (res.status === 409) {
        setError(strings.recipes.deleteBlocked);
        return;
      }
      if (res.ok) {
        router.push("/recipes");
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => open && setError(null)}>
      <AlertDialogTrigger render={<Button variant="outline" disabled={isPending} />}>
        <Trash2 className="size-4" />
        {strings.recipes.deleteRecipe}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.recipes.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.recipes.deleteConfirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{strings.recipes.deleteRecipe}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
