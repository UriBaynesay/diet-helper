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
- `truncate` on a `span` only works if the flex row it's a **direct child of** can itself shrink below its content's natural width — that means `min-w-0` on that *immediate* parent, not just somewhere up the ancestor chain. A common miss: a name + a fixed-size sibling (badge, icon, button) in a `flex items-center gap-2` row — the row needs its own `min-w-0` even if an outer wrapper already has one, or the name never actually truncates and pushes the sibling off-screen on a narrow phone. See `ProductListItem`'s name+badge row for the fixed pattern.
- Mutation handlers (`fetch` for create/update/delete) must never be `if (res.ok) {...}` with no `else` — a failed request should never look identical to nothing happening. Every mutating action in this app sets an error message on failure (`strings.common.genericError`, or a more specific one when the failure reason is actionable, e.g. `strings.recipes.productNotFoundError`) and shows a pending-state label swap (`strings.common.saving`) while in flight. Copy this pattern for any new mutation — don't add a fourth "silent failure" component.

## Use shadcn/ui — don't hand-roll primitives

- Before writing a new interactive primitive (dialog, dropdown, select, popover, tabs, tooltip, etc.), check `src/components/ui/` first, then `npx shadcn@latest add <component>` if it's missing. Don't hand-roll a modal with raw `useState` + a fixed-position `div` when `Dialog` already exists.
- `components.json` has `"rtl": true` — new components generated via the CLI come out RTL-safe. Never hand-edit a freshly generated `src/components/ui/*` file's structure; if it needs a tweak, prefer composing around it in a wrapper component instead.
- shadcn primitives are built on `@base-ui/react` — check the primitive's `.Props` type (e.g. `SelectPrimitive.Value.Props`) before assuming a prop exists.
- Don't put a Next.js `Link` (renders `<a>`) inside `Button`'s `render` prop — `Button` defaults to `nativeButton: true` and base-ui throws a console error when `render` swaps in a non-`<button>` element. For a link styled as a button, apply `buttonVariants({ variant, size })` (exported from `button.tsx`) as the `Link`'s `className` directly instead of composing through `Button`/`render`. `render` is fine for swapping in another *button-semantics* element (e.g. `AlertDialogCancel`'s `Close` composing with `Button`) — the rule is specifically about swapping in a non-button tag.

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

## Form field help text

- If a field's label alone doesn't make its purpose or expected value obvious, add short help text — don't rely on the user to guess or ask. Rule of thumb: if you (the agent) had to explain what a field means after building it, that explanation belongs in the UI, not just in chat.
- Default to an always-visible `text-muted-foreground` line under the field (or shadcn's form description pattern) — this works on every device, touch or not, and per the mobile-first rule above, nothing on a touchscreen can hover.
- For a hint that's secondary/would clutter the form if always shown, use an info icon (`lucide-react`'s `Info` or `CircleHelp`) next to the label instead, revealed via `@media (hover: hover)` / Tailwind's `hover:` variant gated behind a hover-capable pointer — never `hover:`-only with no fallback, since that silently hides the hint on touch devices. Concretely: use shadcn's `Tooltip`/`Popover` (tap-to-open works on both touch and mouse via base-ui) rather than a raw CSS `:hover` reveal, so the same icon is tap-accessible on the phone and hover-accessible on desktop without separate code paths.
- This came up concretely: the product form's "תיאור מנה" (serving description) field paired with "גודל מנה (גרם)" wasn't self-explanatory — it needed a one-line explanation of what a "serving" means and how it relates to the required per-100g macro fields. Fields that are optional/for-future-use (like a product's barcode, unused by any current flow) should say so, so the user doesn't wonder whether skipping them breaks something.
- Keep help text in `strings.ts` like any other UI string — no inline Hebrew literals.

## Conditional (`data-*:`) background utilities render broken — use explicit colors

- In this environment, Tailwind `data-[attr]:bg-<token>` / `data-checked:bg-<token>` utilities (theme-variable-backed backgrounds gated behind a `data-*` state) reliably fail to resolve the color at runtime — the element renders with no visible fill even though the class is present in the DOM and the underlying state (`aria-checked`, React state, etc.) is genuinely correct. Confirmed on `Dialog`/`AlertDialog`/`Select` popups (`bg-popover`) and on `RadioGroup`/`Switch` checked states (`data-checked:bg-primary`).
- **Plain, unconditional `bg-<token>` classes are NOT affected** — e.g. `Badge`'s default `bg-primary` renders fine. The bug is specific to the `data-*:` variant combination, not theme tokens generally. Don't over-fix by rewriting every `bg-*` in `src/components/ui/*` — only ones gated behind a `data-*:`/`aria-*:` conditional.
- Fix: replace the conditional token class with an explicit color pair, e.g. `data-checked:bg-primary` → `data-checked:bg-neutral-900 dark:data-checked:bg-neutral-100`, `bg-popover` → `bg-white dark:bg-neutral-900`. Apply this to any new shadcn component with a `data-checked:`/`data-open:`/`data-selected:`-gated background before shipping it — verify visually, don't assume the class list being correct means the color renders.
- If a control looks non-functional even though logging confirms the state/handler fires correctly (as happened with `RadioGroup`'s `onValueChange`), suspect this rendering bug before suspecting the event wiring — add console logs to confirm state actually changes before touching handler logic.

## Verifying on an actual phone

The dev server binds to a virtual adapter by default and phones can't reach that — use the machine's real LAN IPv4 (`ipconfig` → the Wi-Fi adapter's IPv4, not the Docker/WSL one) and browse to `http://<that-ip>:3000` from a phone on the same Wi-Fi. Useful for catching real touch/viewport issues that browser resizing misses (safe-area insets, actual tap accuracy, on-screen keyboard covering inputs).
