"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
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

export function ArchiveProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await fetch(`/api/products/${productId}/archive`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        setError(strings.common.genericError);
      }
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => open && setError(null)}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={strings.products.archive} disabled={isPending} />
        }
      >
        <Archive className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.products.archiveConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.products.archiveConfirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={isPending}>
            {strings.products.archive}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
