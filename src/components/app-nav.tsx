import Link from "next/link";
import { strings } from "@/lib/strings";

type ActiveScreen = "today" | "products" | "profile" | "recipes" | "suggestions";

const ITEMS: { key: ActiveScreen; href: string; label: string }[] = [
  { key: "today", href: "/", label: strings.nav.today },
  { key: "products", href: "/products", label: strings.nav.products },
  { key: "recipes", href: "/recipes", label: strings.nav.recipes },
  { key: "suggestions", href: "/suggestions", label: strings.nav.suggestions },
  { key: "profile", href: "/profile", label: strings.nav.profile },
];

export function AppNav({ active }: { active: ActiveScreen }) {
  return (
    <nav className="flex items-center gap-4 overflow-x-auto border-b px-4 py-2">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={
            active === item.key
              ? "shrink-0 text-sm font-semibold"
              : "shrink-0 text-sm text-muted-foreground"
          }
        >
          {item.label}
        </Link>
      ))}
      <form action="/api/logout" method="POST" className="ms-auto shrink-0">
        <button type="submit" className="text-sm text-muted-foreground">
          {strings.auth.logout}
        </button>
      </form>
    </nav>
  );
}
