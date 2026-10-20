# App: diet-helper

## What this is

A personal diet-tracking Next.js app — products, recipes, meal suggestions,
nutrition-label photo extraction, AI-assisted recipe entry (Anthropic SDK),
profile/goals (BMI/BMR/TDEE, weight log, macro goals), password + session
auth, and a daily per-user nutrition-summary email/notification job.

Own history predates this project (moved in from a standalone repo, remote:
`github.com/UriBaynesay/diet-helper`, branch `main`) — see `git log` for the
real build history and `AGENTS.md` for its existing dev conventions (mobile
testing over LAN/Tailscale, the `code-documentation` and `git-workflow`
skills already set up for this app specifically).

See the root [`CLAUDE.md`](../../CLAUDE.md) for the project-wide process
this app now follows: infra is introduced gradually, driven by this app's
actual state and real limitations — not pre-planned.

## Current state

- **Fully containerized: `docker compose up -d --build` runs the whole
  stack** — the app (built via `Dockerfile`, multi-stage) and Postgres,
  networked together, app waiting on Postgres's real healthcheck before
  starting. Published on `localhost:3000` (app) and `localhost:5432`
  (Postgres, for direct DB access/tooling). Verified end to end: container
  builds, both report healthy/ready, `GET /api/health` returns 200, full
  test suite passes.
- **Still runs natively too** — `npm run dev` (Turbopack) and
  `npm run build && npm run start` remain valid, unchanged (see `AGENTS.md`
  — dev mode is broken on iOS Safari/Chrome over non-localhost addresses;
  the standalone prod build is not). Native dev's `DATABASE_URL`
  (`localhost:5432`, from `.env`) still works against the same Postgres
  container, since its port is still published to the host.
- **A third way to run it: containerized dev mode with hot-reload,** via
  `docker-compose.override.yml` + `Dockerfile.dev`. Plain `docker compose
  up` automatically merges the override on top of the base file — no flag
  needed — swapping just the `app` service's build/command/volumes for a
  bind-mounted source tree running `npm run dev` inside the container,
  instead of the frozen production build. Editing a file on the host is
  reflected immediately, no rebuild. To skip the override and run the real
  production-like build instead, name the base file explicitly:
  `docker compose -f docker-compose.yml up -d --build`. See the Infra
  Knowledge doc's Compose section for the full reasoning and a real
  dev-mode gotcha hit while verifying this (Next's `<title>` metadata
  lagging behind an otherwise-instant Fast Refresh).
- **A real scheduled task already exists in the code, unwired to any
  scheduler:** `POST /api/cron/daily-summary` sends each opted-in user their
  daily nutrition summary (per-user timezone, with one-day catch-up logic
  for a missed run). It's guarded by a shared secret
  (`x-cron-secret` / `CRON_SECRET`), not a session — designed to be called
  by an external scheduler, not a logged-in user. There's also a lighter
  `/api/cron/ping` route. Neither is currently triggered by anything — this
  is the project's first concrete, already-built candidate for the
  app-level-scheduling question logged in the Infra Knowledge doc (in-process
  scheduler vs. systemd-as-alarm-clock).

## Docker was removed, then rebuilt deliberately in two steps

This app arrived with a working `docker-compose.yml` (app + Postgres,
health checks, volumes for uploads/backups) built independently, before this
project's gradual/felt-limitation process existed. It was removed on move-in
(commit "Remove Docker setup") rather than kept, because it wasn't arrived
at through that process. It came back in two separate, deliberately-scoped
steps rather than restored at once:

1. **Postgres only**, once "no database" became the actual felt limitation
   — rebuilt from scratch (not copied from git history). See the Infra
   Knowledge doc's Docker entry (Containers / Images / Mounts → Volumes /
   Compose / Networking Across Compose Projects subsections) for the
   concepts underlying every line of it.
2. **The app itself**, once running the full stack together became the
   next real step — a multi-stage `Dockerfile` (builder stage: full
   `node_modules`, runs `npm run build`; runner stage: only the pruned
   `output: "standalone"` result) and an `app` service in
   `docker-compose.yml` alongside `postgres`.

Details worth remembering:
- **The Postgres init script is restored**, rewritten with explanatory
  comments rather than copied verbatim: `docker/postgres/init/00_extensions.sql`
  enables `citext` (case-insensitive text — the users table's email column,
  so signup/login don't care about letter case) and `pg_trgm` (trigram fuzzy
  search — product/recipe search tolerating typos/partial matches, and
  usable by a real index instead of a slow `LIKE` scan). It's bind-mounted
  read-only to `/docker-entrypoint-initdb.d`, which Postgres's official
  image auto-runs, but **only on a brand-new, empty `pgdata` volume** — it
  will not re-run if edited later against an already-initialized database;
  that would need a manual `CREATE EXTENSION` or a fresh volume.
- **`DATABASE_URL` differs between the two runtime contexts, deliberately.**
  `.env`'s value (`localhost:5432`) is for host-side native dev.
  `docker-compose.yml`'s `app` service overrides it via an explicit
  `environment:` entry pointing at `postgres:5432` (the in-network
  hostname) — inside a container, `localhost` would mean the app container
  itself, not Postgres. Every other var is passed through from `.env` via
  Compose's `${VAR}` substitution (no separate `.env.docker` file — that
  option was considered and deliberately not used, since duplicating every
  var into a second file is a real, recurring drift risk for the one value
  that actually needs to differ).
- **No secrets are baked into the image.** The build stage needs zero env
  vars (verified by running the build with none present); all real config
  is injected at container-start time via Compose, not during `docker build`.

## UI design system (redesign, Stages 1-6, complete)

Every screen has been restyled to a single shared visual language, per a
design handoff (`design_handoff_diet_app_redesign`). **Any new UI work
(new screens, new components, edits to existing ones) should follow this
system rather than plain shadcn defaults** — the two are visually
inconsistent side by side, and the whole point of the redesign was to
retire the old default look everywhere, not leave it in whichever corner
hasn't been touched yet.

Tokens are real CSS custom properties in `src/app/globals.css` (`:root`),
exposed to Tailwind via `@theme inline` — reach for these by name, not
arbitrary hex/oklch values or ad-hoc rem sizes:

- **`--accent-coral`** — the one accent color. Primary actions only: a
  screen's main submit button, the meals/products "+" add button, an
  active segmented-toggle state. Not for secondary/destructive actions.
- **`--ink-muted`** / **`--ink-mid`** — secondary text (labels, hints,
  metadata lines, kickers), never `text-muted-foreground` from stock
  shadcn — this app's palette defines its own muted-ink scale instead.
- **`--border`** — every card/section border color, set explicitly via
  `style={{ borderColor: "var(--border)" }}` rather than relying on the
  Tailwind `border` utility's default.
- **`--muted`** — the flat background for a pill/chip/stat-tile/no-op
  banner (e.g. a "no goal set" notice, a BMI stat card).
- **`--destructive`** — explicit background for a real destructive action
  button (delete/archive confirm), not just red text.
- Radii are named for usage, not a t-shirt scale: `rounded-[18px]` (a
  card/section — matches `--radius-card`), `rounded-t-[24px]` (a bottom
  sheet — matches `--radius-sheet`), `rounded-xl`/`rounded-2xl` for
  inputs and pill buttons.
- `font-display` — screen titles and sheet headers only (see any page's
  `<h1>`), not body text.

Recurring shell patterns, with a reference file for each — read the
reference before building something new in the same family rather than
reinventing it:

- **List-item card**: `rounded-[18px] border bg-card p-3.5` with
  `style={{ borderColor: "var(--border)" }}`, bold name line + a muted
  `dir="ltr"` metadata/macro line underneath. Reference:
  [`product-list-item.tsx`](src/components/products/product-list-item.tsx),
  [`meal-list-item.tsx`](src/components/meals/meal-list-item.tsx).
- **Bottom-sheet form**: `Sheet`/`SheetContent side="bottom"` (not a
  centered `Dialog`) with `className="max-h-[86%] rounded-t-[24px] p-0"
  showCloseButton={false}`, a manual header row (Cancel button — title —
  spacer div) instead of the default `SheetTitle`/close-X, fields via a
  local `Field` helper (label in `--ink-muted`, optional `FieldHint`), and
  a full-width `h-12 rounded-2xl` coral submit button pinned at the
  bottom. Reference:
  [`product-form-dialog.tsx`](src/components/products/product-form-dialog.tsx),
  [`meal-form-dialog.tsx`](src/components/meals/meal-form-dialog.tsx),
  [`add-food-dialog.tsx`](src/components/diary/add-food-dialog.tsx).
- **Page shell**: `<main className="mx-auto flex w-full max-w-lg flex-1
  flex-col gap-3 p-4 pb-32">`, an `<h1 className="font-display text-[26px]
  font-extrabold">` title, `<BottomNav />` as a page-level sibling (fixed,
  outside `<main>`). Reference any restyled page under `src/app/`.
- **Segmented toggle (two/three mutually-exclusive options)**: a plain row
  of `Button`s, `variant="default"` + `style={{ background:
  "var(--accent-coral)" }}` for the active one, `variant="outline"`
  otherwise. **Deliberately not** shadcn's `Toggle`/`ToggleGroup` — that
  primitive's `data-[state=on]:bg-muted` styling is confirmed broken in
  this environment (see the `frontend-ui-ux` skill). Reference: the
  manual/paste mode switch in `meal-form-dialog.tsx`, the sex picker in
  [`profile-form.tsx`](src/components/profile/profile-form.tsx).
- **Confirm-destructive dialog**: `AlertDialogContent` with
  `className="rounded-[20px]"`, `AlertDialogAction` given
  `style={{ background: "var(--destructive)" }}` explicitly (stock shadcn
  doesn't color it red by default). Reference:
  [`archive-product-button.tsx`](src/components/products/archive-product-button.tsx),
  [`delete-meal-button.tsx`](src/components/meals/delete-meal-button.tsx).

General rules that held across every stage, worth restating since they're
easy to regress on a new screen:

- Reuse `Button`/`Input`/`Select`/etc. — never a raw `<button>`/`<input>`
  (an existing, non-negotiable rule from the `frontend-ui-ux` skill; also
  caught and fixed mid-redesign once already).
- RTL/Hebrew: logical Tailwind properties only (`ps-`/`pe-`/`start-`/`end-`
  , never `left`/`right`), `dir="ltr"` wrapping around any numeric/macro
  value, all UI strings centralized in `src/lib/strings.ts` — never an
  inline literal.
- Every card/section border and muted-text color is set via an explicit
  `style={{ color/borderColor: "var(--token)" }}`, not a Tailwind color
  utility class — this app's tokens aren't wired into Tailwind's default
  color utilities (`text-muted-foreground` etc. still point at stock
  shadcn grays, not this palette).

## Installable app (PWA)

Installable from the browser ("Add to Home Screen"): `src/app/manifest.ts` (Hebrew, RTL,
standalone, colours = the `--background` token), icons in `public/icons` + `src/app/apple-icon.png`
(rendered from `public/icons/icon.svg`), `appleWebApp` + `viewport.themeColor` in `layout.tsx`.

**Offline = a friendly page, nothing more.** `public/sw.js` is ~40 lines and caches only
`/offline.html` and the icons; for page navigations it goes network-first and falls back to the
offline page. It never touches `/api/*`, POSTs, or any signed-in page: every page here is
personal data rendered by the server, so none may ever sit in a cache. `offline.html` is
self-contained (inline CSS, no scripts of the app) because the app's own JS/CSS chunks are not
cached and a Next page would render broken offline. Registered in production only
(`ServiceWorkerRegister`). Bump `VERSION` in `sw.js` when it or the precached files change.

**Gotcha that breaks installs silently:** `src/proxy.ts` redirects every signed-out request to
`/login`, including the manifest, `sw.js`, the icons and the offline page unless they are
excluded in `config.matcher`. They are (prefix matches), and `src/proxy-matcher.test.ts` pins both
that these paths bypass the login and that every real page and API route still needs it.
Serwist (the usual Next PWA library) was not used: it needs webpack and this project builds with
Turbopack.

## Guardrails specific to this app

- Don't reintroduce Docker (or any other infra) here speculatively — wait
  for it to come up as the real next step per the root CLAUDE.md's process.
- `AGENTS.md`'s existing conventions (documentation via `code-documentation`
  skill, git workflow via `git-workflow` skill, production-build mobile
  testing) still apply and predate this project — don't override them
  without reason.
