"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";

type NavKey = "today" | "products" | "meals" | "suggestions" | "profile";

// Active state is derived from the real current route via usePathname(),
// not passed as a manual `active` prop per page (the old AppNav pattern) —
// fixes the risk of a page rendering the wrong active tab if the prop and
// the actual route ever drifted apart.
function isActive(pathname: string, item: NavKey): boolean {
  if (item === "today") return pathname === "/";
  return pathname.startsWith(`/${item}`);
}

const ICONS: Record<NavKey, React.ReactNode> = {
  today: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 2v4M16 2v4M7.5 13l2.5 2.5L16 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  products: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  meals: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 001.5-1.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  ),
  suggestions: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: "today", href: "/", label: strings.nav.today },
  { key: "products", href: "/products", label: strings.nav.products },
  { key: "meals", href: "/meals", label: strings.nav.meals },
  { key: "suggestions", href: "/suggestions", label: strings.nav.suggestions },
  { key: "profile", href: "/profile", label: strings.nav.profile },
];

/**
 * Fixed bottom tab bar, per the UI redesign handoff. Replaces AppNav.
 * Logout has no home here (the redesign has no nav-bar logout affordance) —
 * it moves to the Profile screen in a later stage; there is deliberately no
 * interim logout UI until then.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card px-1.5 pt-2.5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.key);
        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-0.5 py-0.5"
            style={{ color: active ? "var(--accent-coral)" : "var(--ink-muted)" }}
          >
            {ICONS[item.key]}
            <span className="text-[10.5px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
