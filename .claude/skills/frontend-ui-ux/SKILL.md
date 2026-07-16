---
name: frontend-ui-ux
description: Building or modifying any UI in this app - screens, dialogs, forms, components. Use whenever touching src/app/**/page.tsx, src/components/**, or anything user-facing.
---

# Frontend UI/UX

This app is Hebrew, RTL, and mobile-first. The owner uses it primarily on their phone. Every screen must work on a small touchscreen before it's considered done.

## Mobile-first, always

- Design and test at phone width first (~375px), then check it still holds up wider. Don't design desktop-first and hope mobile "just works."
- Tap targets: minimum ~40px hit area for buttons/icons — shadcn's default `Button` sizes already satisfy this, don't shrink them below the `sm` variant for anything tappable.
- Forms: prefer native inputs with correct `type`/`inputMode` (`type="number"`, `dir="ltr"` for numeric fields) so mobile keyboards show the right layout.
- Dialogs (shadcn `Dialog`) already constrain to `max-w-[calc(100%-2rem)]` — don't override that with a fixed wide `max-w-*` that breaks on narrow screens.
- Avoid hover-only affordances (hover-to-reveal actions, tooltips-only) — nothing on a touchscreen hovers. If an action needs a trigger, make it always-visible or tap-activated.
- Test any new screen by resizing the browser to phone width (or actual phone over LAN — see below) before calling it done.

## Use shadcn/ui — don't hand-roll primitives

- Before writing a new interactive primitive (dialog, dropdown, select, popover, tabs, tooltip, etc.), check `src/components/ui/` first, then `npx shadcn@latest add <component>` if it's missing. Don't hand-roll a modal with raw `useState` + a fixed-position `div` when `Dialog` already exists.
- `components.json` has `"rtl": true` — new components generated via the CLI come out RTL-safe. Never hand-edit a freshly generated `src/components/ui/*` file's structure; if it needs a tweak, prefer composing around it in a wrapper component instead.
- shadcn primitives are built on `@base-ui/react` — check the primitive's `.Props` type (e.g. `SelectPrimitive.Value.Props`) before assuming a prop exists.

## Reuse before building new

- Before adding a new component, check `src/components/` for something close enough to extend or compose. This app already has small reusable pieces (`MacroProgress`, `DateNav`, `EntryList`, `DeleteEntryButton`, `AddFoodDialog`) — follow that granularity: one focused component per concern, composed in the page, not one large page-specific blob.
- Shared logic that both a Server Component and an API route need (e.g. `getDiaryDay`) belongs in `src/lib/`, called from both — never duplicate a query or calculation between a route handler and a page.
- Server Components read auth via `getCurrentUser()` (`src/lib/auth/current-user.ts`), not by re-deriving header logic.

## RTL and Hebrew — non-negotiable

- `dir="rtl"` is set at the `<html>` level. Use **logical Tailwind properties only**: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`. Never `ml-*`/`mr-*`/`pl-*`/`pr-*`/`left-*`/`right-*`/`text-left`/`text-right` in project code (shadcn's own generated `ui/*` files are the one exception — they're vendored, don't rewrite them for this).
- Directional icons (chevrons, arrows) must be checked against what they mean, not just copy-pasted — "previous" in a RTL timeline is a *right*-pointing chevron, "next" is *left*-pointing. See `DateNav` for the reasoning and don't flip it back without re-deriving why.
- All Hebrew strings live in `src/lib/strings.ts` (`strings.<section>.<key>`) — never inline a Hebrew string literal in a component. Add new keys there first.
- Numbers/units that read left-to-right (grams, kcal, dates in ISO, phone numbers) must be wrapped in `<span dir="ltr">` so they don't get mirrored mid-sentence. See `formatAmount` in `MacroProgress` for the pattern.
- Format dates via `Intl.DateTimeFormat('he-IL', ...)` (see `src/lib/format-date.ts`), never hand-built date strings.

## Verifying on an actual phone

The dev server binds to a virtual adapter by default and phones can't reach that — use the machine's real LAN IPv4 (`ipconfig` → the Wi-Fi adapter's IPv4, not the Docker/WSL one) and browse to `http://<that-ip>:3000` from a phone on the same Wi-Fi. Useful for catching real touch/viewport issues that browser resizing misses (safe-area insets, actual tap accuracy, on-screen keyboard covering inputs).
