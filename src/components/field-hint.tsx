"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Tap/click-to-open info icon for a secondary field hint — works the same on touch and mouse. */
export function FieldHint({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className="text-muted-foreground"
        aria-label={text}
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs">{text}</PopoverContent>
    </Popover>
  );
}
