import Link from "next/link";
import { strings } from "@/lib/strings";

export function AppNav({ active }: { active: "today" | "products" }) {
  return (
    <nav className="flex justify-center gap-4 border-b py-2">
      <Link
        href="/"
        className={active === "today" ? "text-sm font-semibold" : "text-sm text-muted-foreground"}
      >
        {strings.nav.today}
      </Link>
      <Link
        href="/products"
        className={active === "products" ? "text-sm font-semibold" : "text-sm text-muted-foreground"}
      >
        {strings.nav.products}
      </Link>
    </nav>
  );
}
