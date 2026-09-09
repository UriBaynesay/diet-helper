"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/**
 * Logout's home per the redesign — deferred from the nav bar (see
 * bottom-nav.tsx) until Profile existed to hold it.
 */
export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const res = await fetch("/api/logout", { method: "POST" });
      // The route redirects server-side, but fetch() doesn't follow that
      // into a navigation — do it explicitly once the cookie is cleared.
      if (res.redirected || res.ok) {
        window.location.href = "/login";
      }
    });
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={isPending}
      className="justify-center gap-1.5 rounded-xl text-destructive"
    >
      <LogOut className="size-4" />
      {strings.auth.logout}
    </Button>
  );
}
