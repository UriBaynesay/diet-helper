# diet-helper

Personal Hebrew-RTL diet-tracking web app. Runs on the owner's PC; reachable on the local network directly, and remotely via [Tailscale](https://tailscale.com) (a private VPN between the owner's own devices — no public exposure, no domain required). See `diet-helper-functional-spec.md` for the full product/technical spec.

## Stack

Next.js 16 (App Router) + TypeScript, PostgreSQL + Drizzle ORM, Tailwind CSS v4, a single shared password + signed session cookie for auth, Docker Compose (app + Postgres).

## Local development

1. Copy `.env.example` to `.env` and fill in values. For local dev, `DATABASE_URL` should point at `localhost:5432` (the Dockerized Postgres, published to the host).
2. Start Postgres only:
   ```bash
   docker compose up -d postgres
   ```
3. Install deps and run migrations:
   ```bash
   npm install
   npm run db:migrate
   ```
4. Seed the owner user (required before you can authenticate — see below):
   ```bash
   OWNER_EMAIL=you@example.com npm run db:seed-owner
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Auth

A single shared password protects the whole app — there's no per-user account system, matching the spec's single-owner model. `POST /api/login` (`src/app/api/login/route.ts`) checks the submitted password against `APP_PASSWORD`; on success it signs a session token (`src/lib/auth/session.ts`, `jose`/HS256, keyed by `SESSION_SECRET`) binding the session to `OWNER_EMAIL`, and sets it as an `httpOnly` cookie (30-day expiry). `src/proxy.ts` verifies that cookie's signature on every request — a hand-crafted cookie value is rejected (unlike the earlier dev-only bypass, which trusted an unsigned cookie/header outright). `POST /api/logout` clears the cookie.

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/login --data-urlencode "password=$APP_PASSWORD" --data-urlencode "from=/"
curl -b cookies.txt http://localhost:3000/api/whoami
```

The verified session email must match a seeded, allowed user (`users.is_allowed = true`) or you'll get a 403 — see the seed step above. `OWNER_EMAIL` is both the seed script's target and the identity every session is issued for, since this app has exactly one real user.

**Previously (removed):** this app used to authenticate via Cloudflare Access (JWT verification against Cloudflare's JWKS, reachable through a Cloudflare Tunnel) with a `NODE_ENV`-gated dev bypass for local testing. That whole path — `cloudflared` in `docker-compose.yml`, `src/lib/auth/jwks.ts`, the `CF_ACCESS_*` env vars, `/api/dev-login` — was removed in favor of the simpler password+session model above, since the app is only ever accessed from the owner's own devices (LAN or Tailscale) and never needs to be genuinely public.

## Database / migrations

Schema lives in `src/db/schema/`. Workflow:

```bash
npm run db:generate   # drizzle-kit: diff schema -> new SQL file in drizzle/migrations/
npm run db:migrate    # apply pending migrations (src/db/migrate.ts)
```

Commit both the generated SQL and the `drizzle/meta/` journal.

`pg_trgm` is required (enabled via migration + `docker/postgres/init/00_extensions.sql`) for the fuzzy-search GIN index on `products.name`.

## Products API

Products are shared across all users (no per-user filtering) — the library and its nutrition facts are a common good, not personal data. Archiving is a soft-delete (`archived_at`); products are never hard-deleted.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/products?q=&filter=` | Fuzzy search on `name` via `pg_trgm` (falls back to a substring `ILIKE` match for queries below the similarity threshold). `filter`: `all` \| `manual` \| `image` \| `unverified` |
| POST | `/api/products` | Create |
| PATCH | `/api/products/:id` | Partial update |
| POST | `/api/products/:id/archive` | Soft-delete |

All routes require auth (session cookie, see Auth above). Requests and responses follow the app-wide `{ data }` / `{ error: { code, message } }` shape (`src/lib/api-response.ts`).

Validation (`src/lib/products/schema.ts`, Zod): all macros must be `>= 0`. A product's macros are also checked against its stated `kcalPer100g` (`4*protein + 4*carbs + 9*fat`) — a mismatch over 15% does **not** block the write, it returns `warning: "kcal_mismatch"` alongside the saved product so the caller can flag it for review instead of losing the data.

**Known gap:** seed data for ~100 common Israeli staples (spec §11.3's bootstrapping suggestion) is deferred — no nutrition data source has been chosen yet.

## Image Extraction API

`extraction_jobs` is private per user — `status` (`pending`/`processing`/`succeeded`/`failed`), `raw_response`/`parsed` as jsonb, `confidence`, `error`, and a nullable `product_id` set once a job is confirmed and saved as a product.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/products/extract` | Upload a label photo (multipart `image` field; jpeg/png/webp/heic, ≤10MB) → creates and processes an extraction job |
| GET | `/api/products/extract/:jobId` | Poll job status/result |
| POST | `/api/products/extract/:jobId/retry` | Re-runs extraction against the **already-stored** image — no re-upload |

The uploaded image is downscaled server-side to 1568px on the long edge (`sharp`, `src/lib/extraction/storage.ts` — heic is converted to jpeg, since the vision API doesn't accept heic directly) and saved under `./data/uploads/{uuid}.{ext}` (gitignored). Extraction calls Claude Sonnet 5 (`model: "claude-sonnet-5"`) vision via the SDK's structured-output helper (`messages.parse` + `zodOutputFormat`) — the model returns strict JSON matching a fixed schema, never free text. Given personal-app volume, a job is processed inline rather than through a queue; the job row and polling endpoint still give callers a consistent pending → processing → succeeded/failed contract.

Per-serving labels are normalized to per-100g using the label's `serving_size_g` (`src/lib/extraction/normalize.ts`, pure and unit-tested against the spec's own example: a 30g/120kcal per-serving panel becomes exactly 400 kcal/100g). If a per-serving label has no printed serving size, that's not treated as a failure — the raw per-serving values are left for the human to supply a serving size during review. The Phase 2 4/4/9 sanity check (`kcalSanityWarning`) runs against the *normalized* per-100g values; if it fails, `confidence` is force-downgraded to `low` regardless of what the model reported.

**The model never writes a `products` row.** `POST /api/products/extract` only ever produces an `extraction_jobs` row. A product is created solely via the existing `POST /api/products`, now accepting an optional `extractionJobId` — this is the human-confirmed review step. That call verifies the job belongs to the caller and has `status: "succeeded"`, then sets `source: "image"` and `isVerified: true` and links `extraction_jobs.product_id` back to the new product. No review-screen UI exists yet; the confirm step *is* that `POST /api/products` call.

Verified end-to-end with two real (non-mocked) Claude Sonnet 5 calls against synthetically generated label images: a per-100g label was transcribed exactly (name, brand, all macros, `confidence: "high"`, 4/4/9 check passed), and a per-serving-only label (30g/120kcal) normalized to precisely 400 kcal/100g, matching the spec's own worked example. Also verified: unsupported file type → 400, unauthenticated upload → 401, polling another user's job → 403/404, and retry re-processing the stored image without a new upload while preserving an existing `productId` link.

## Diary API

`diary_entries` is private per user — scoped by the verified `user_id` from `requireUser()`, never trusted from the client — unlike products, which are shared.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/diary?date=YYYY-MM-DD` | That day's entries + summed totals for the authenticated user |
| POST | `/api/diary` | Create: either `{entryDate, mealType, productId, quantityG}` or `{entryDate, mealType, recipeId, servings}` |
| PATCH | `/api/diary/:id` | Edit `entryDate` / `mealType` / `quantityG` (product entries only) |
| DELETE | `/api/diary/:id` | Remove |

Macros are snapshotted at log time onto the entry itself (`kcal`/`proteinG`/`carbsG`/`fatG`) — editing a product's nutrition later does **not** retroactively change existing diary entries. Only an explicit `PATCH` to `quantityG` recomputes macros, and it uses the product's *current* values at the time of that edit.

`POST /api/diary` accepts a product entry or a recipe entry (a Zod union mirroring the DB's `CHECK` requiring exactly one of `product_id` / `recipe_id`). A recipe entry multiplies the recipe's per-serving nutrition (from the `recipe_nutrition` view) by `servings` and snapshots the result the same way a product entry does. Only `ready` recipes can be logged.

`GET /api/diary` returns a `target` (kcal/protein/carbs/fat) sourced from the goal active on the viewed date, or `null` if none exists yet — see Goals below.

## Recipes & Suggestions API

`recipes` and `recipe_ingredients` are shared across users, like `products` — no per-user filtering. **Recipes are manual-only**: every ingredient always has a `productId` and `quantityG` set (both `NOT NULL`), so a recipe is always immediately loggable and suggestable — there's no draft/ready/rejected lifecycle.

`recipe_nutrition` is a **SQL view**, not a table — sum of ingredient macros ÷ servings, derived and never stored. It's created by a raw-SQL migration (`drizzle/migrations/0005_recipe_nutrition_view.sql`) and mapped read-only into Drizzle via `.existing()` (`src/db/schema/recipe-nutrition.ts`) so drizzle-kit doesn't try to manage or recreate it.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/recipes` | List all recipes |
| POST | `/api/recipes` | Create a recipe + its ingredients in one call |
| GET | `/api/recipes/:id` | Recipe + ingredients + derived nutrition |
| PATCH | `/api/recipes/:id` | Partial update; replaces the ingredient list if `ingredients` is provided |
| DELETE | `/api/recipes/:id` | Hard delete — blocked with `409 in_use` if a diary entry references it (same "can't remove what's referenced" rule as products, enforced by the FK and caught cleanly) |
| POST | `/api/recipes/parse` | Haiku breaks pasted recipe text into a structured, **unmatched** ingredient list — see below |
| GET | `/api/suggestions?date=` | Top 5 ranked recipe servings for what's left of that day's target |

`GET /api/suggestions` computes remaining macros (active goal − today's consumed, via the same `findActiveGoal` lookup `/api/goals` uses), scores every recipe's half/single/double-serving candidates with a deterministic weighted-deviation formula (`src/lib/suggestions/scorer.ts`, pure and unit-tested — protein weighted 2.0, kcal 1.5, carbs/fat 1.0, lower score is better), and hard-filters out anything more than 20% over remaining kcal or referencing an archived product. Verified via curl: archiving a recipe's ingredient product removes it from suggestions; logging a recipe reduces the remaining macros used by later suggestion calls; a recipe closer to the remaining macros consistently outranks a worse match at the same calorie level.

### AI-assisted recipe entry (`POST /api/recipes/parse`)

`src/lib/recipes/parse-recipe.ts` calls Claude Haiku 4.5 (cost-control — this is a text-only parsing task, no vision needed) with freeform pasted recipe text and a Zod-validated output schema (`src/lib/recipes/parse-schema.ts`): recipe name/description/servings/prepMinutes/instructions (all nullable — never guessed if absent from the text) plus a list of ingredient lines (`name`, `quantity`, `unit`, and a best-effort `estimatedQuantityG` the model derives when reasonably confident, e.g. "2 cups flour" → ~240g; left `null` for count-based or vague items like "1 onion" or "salt to taste").

**The model never sees the product library and never returns a `productId`.** This route only ever returns freeform parsed text — matching each ingredient to a real product is a UI step the human does afterward via the same per-row product search used for manual entry (`IngredientRow`), same as the image-extraction pipeline's "model never writes a product row directly" rule. A recipe can't be saved until every ingredient the user keeps has a real, human-selected `productId`.

Verified with a real (non-mocked) Haiku call against a pasted English recipe: correctly extracted name/servings/prepMinutes/instructions and all three ingredient lines, including leaving `estimatedQuantityG: null` for a count-based ingredient ("1 small onion") it wasn't confident enough to convert to grams.

### Removed: Spoonacular recipe ingestion (Phase 8)

The Spoonacular-based recipe ingestion pipeline (scheduled cron ingest, 3-tier product matching, mapping-review queue, `unit_conversions`/`ingest_runs` tables, `recipe_ingredients.raw_text`/`parsed_*`/`match_confidence` columns, `recipes.status`/`source`/`sourceName`/`sourceUrl`/`externalId`) was removed in favor of manual-only recipe entry (optionally AI-assisted via the paste-and-parse flow above). Migration `drizzle/migrations/0009_previous_millenium_guard.sql` drops the now-unused tables/columns and tightens `recipe_ingredients.productId`/`quantityG` to `NOT NULL`, since every recipe ingredient is now always fully resolved by construction.

## Profile, BMI & Goals API

`weight_logs` and `goals` are private per user, like `diary_entries`.

- `weight_logs` is unique on `(user_id, logged_on)` — logging a second weight the same day **updates** that day's entry rather than creating a duplicate.
- `goals` is **append-only**: rows are never updated or deleted. The goal active for a given date is the row with the greatest `effective_from <= that date` (`src/lib/goals/active-goal.ts`, shared by `GET /api/goals` and `GET /api/diary`). Saving a new goal never changes what target was active on a past date — verified via curl: saved a goal effective 2026-07-14, then a second one effective 2026-08-01, and confirmed `GET /api/diary?date=2026-07-14` still returned the *first* goal's target unchanged while `date=2026-08-15` returned the second.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/profile` | Current profile + latest weight log |
| POST | `/api/profile` | Update `sex`/`birthDate`/`heightCm`/`activityLevel`/`notificationsEnabled`; optionally log/upsert today's (or `loggedOn`'s) weight via `weightKg` |
| GET | `/api/bmi?goalType=lose\|maintain\|gain` | BMI, BMR (Mifflin-St Jeor), TDEE, calorie target (goal-adjusted, floored at 1200 kcal), suggested macro split. Requires `sex`/`birthDate`/`heightCm`/`activityLevel` set and at least one weight log — 400 otherwise |
| GET | `/api/goals?date=` | The active goal for that date (default today), or `null` |
| POST | `/api/goals` | Append a new goal row (never updates an existing one) |

All BMI/BMR/TDEE/macro-split math is in `src/lib/profile/calculations.ts` as pure, unit-tested functions (`npm test`) — no DB access, so they're cheap to verify against the spec's own formulas directly. The BMI disclaimer text lives in `strings.bmi.disclaimer` (`src/lib/strings.ts`) and is returned in the `GET /api/bmi` response.

## Daily Summary Email

`notification_logs` is private per user — one row per `(user, type, covers_date)`, used for idempotency and catch-up.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/cron/daily-summary` | Sends each eligible user their daily progress email |

Guarded the same way as `/api/cron/ping` — `X-Cron-Secret` (`src/lib/cron/guard.ts`), not the session cookie. Iterates every user with `is_allowed = true AND notifications_enabled = true` (a user failing either check is excluded from the query entirely, not merely skipped).

For each eligible user, "today" is resolved in *that user's* `timezone` via `Intl.DateTimeFormat` (`src/lib/notifications/timezone.ts`) — never the container's UTC clock — then the route attempts today's summary and, separately, yesterday's (**catch-up**, in case the PC was asleep at the scheduled time; never further back than one day). Each attempt is idempotent: `send-daily-summary.ts` checks `notification_logs` for an existing `status = 'sent'` row for that user/date first, and skips cleanly (no email, no duplicate log) if already sent, if the day has zero diary entries, or if there's no active goal for that date.

Email is sent via Nodemailer over Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) using `GMAIL_USER`/`GMAIL_APP_PASSWORD` — a real **Gmail App Password**, which requires 2-Step Verification enabled on the account. Subject and verdict copy are pure, tested functions (`src/lib/notifications/summary.ts`) matching the spec's own worked examples exactly.

**RTL email gotcha found during testing:** `dir="rtl"` on `<html>`/`<body>` alone is not enough for Gmail — every text-bearing table cell needs its own explicit `dir="rtl"` attribute, and numeric "consumed / target unit" pairs need to be wrapped in `dir="ltr"` spans or the numbers render reversed (same rule the spec gives for the app UI, extended here to email). The template (`src/lib/notifications/template.ts`) was iterated once on real visual feedback into a rounded card with a circular kcal-percent indicator, per-macro progress bars, and a pill CTA button — verified by actually receiving and reading real test emails in Gmail, including the catch-up variant's amber "sent late" banner.

Verified via curl + live email delivery: calling the endpoint twice for the same day sent exactly one email (one `notification_logs` row); a diary entry logged for yesterday plus a backdated goal triggered a real catch-up email labeled for the correct date; `notifications_enabled = false` excludes the user with an empty result and no email; missing/wrong `X-Cron-Secret` both 401; a day with zero diary entries is skipped with no email sent.

## Environment variables

See `.env.example` for the full list. Notes:
- `DATABASE_URL` in `.env` is for host-side tooling (`npm run dev`, `db:migrate`, seed script). Inside `docker-compose.yml`, the `app` service overrides this to point at the `postgres` service hostname instead of `localhost`.
- `APP_PASSWORD` is the app's one login password (see Auth above) — required at runtime by `src/lib/env.ts` as soon as any request hits `proxy.ts`.
- `SESSION_SECRET` signs session cookies (`jose`/HS256) — generate a long random value, e.g. `openssl rand -base64 32`. Changing it invalidates every existing session (forces re-login everywhere).
- `OWNER_EMAIL` is read both by `scripts/seed-owner.ts` (to seed the one allowed user row) and by `POST /api/login` (the identity every session is issued for).
- `CRON_SECRET` guards `/api/cron/*` routes — these are excluded from the auth proxy's matcher entirely (an OS scheduler calls them locally with no session cookie) and are protected by this shared secret instead (`src/lib/cron/guard.ts`).
- `GMAIL_USER`/`GMAIL_APP_PASSWORD` (a Gmail App Password, not the account password — requires 2-Step Verification) and `APP_URL` (used for the "open the app" link in the daily summary email) are required at runtime by `src/lib/env.ts` once the notifications cron route is hit.
- `ANTHROPIC_API_KEY` is required at runtime by `src/lib/env.ts` once the image-extraction route (`/api/products/extract`) or the recipe-parse route (`/api/recipes/parse`) is hit.

## Running the full stack

```bash
docker compose up
```

Starts `postgres` and `app` (migrates on boot, then serves on port 3000, published to the host). No tunnel service — reach the app via the host's LAN IP or Tailscale address directly.

## Mobile / remote access

The app has no public exposure by design — it's reachable only from devices on the same local network, or via [Tailscale](https://tailscale.com) (free, private VPN between your own devices; install it on the host PC and on your phone, sign into the same account on both, and the phone can reach the PC's Tailscale IP — e.g. `http://100.x.x.x:3000` — from anywhere with an internet connection, without exposing anything publicly).

`npm run dev` does not work reliably on iOS Safari/Chrome when accessed over a non-`localhost` address (buttons/dialogs silently fail to respond — confirmed dev-mode-specific, likely Turbopack's HMR websocket; see the `frontend-ui-ux` skill). For real phone use, run a production build instead:

```bash
npm run build
npm run start   # scripts/start-prod.sh — copies .env/public/.next/static into
                 # .next/standalone/ (next build's own output doesn't include
                 # them) and serves on PORT (default 3100, distinct from the
                 # dev server's 3000 so both can run at once)
```

`next start` does not work with this project's `output: "standalone"` config (`next.config.ts`) — `scripts/start-prod.sh` runs `node .next/standalone/server.js` directly instead, which is what `npm run start` now wraps.

## Backups

```bash
npm run db:backup
```

Runs `scripts/backup-db.sh` — a host-side shell script, not a Next.js route, since `pg_dump` lives in the `postgres:16-alpine` image, not the app's `node:20-alpine` one. It shells out to `docker exec <container> pg_dump ...` and writes a timestamped dump to `./data/backups/` (gitignored, same pattern as `./data/uploads`), keeping the last 30 backups automatically. `POSTGRES_CONTAINER`/`POSTGRES_USER`/`POSTGRES_DB` are overridable env vars, defaulting to the `docker-compose.yml` service name and the Phase 1 defaults.

Meant to be triggered by the same host OS scheduler that calls the cron endpoints — schedule it alongside (or right after) the `ingest-recipes` trigger, since both already run on a host-scheduler cadence rather than inside a container.

Verified against the real Dockerized Postgres: produced a valid ~28KB SQL dump including the `drizzle` migrations schema, ran twice back-to-back without the retention logic misbehaving on a small file count, and failed cleanly with a non-zero exit code when pointed at a wrong container name — a scheduler needs to detect a failed backup, not silently get an empty one.

## Tests

```bash
npm test   # vitest run
```

Unit tests cover the pure calculation functions only (macro math, BMI/BMR/TDEE, sanity checks) — no DB/UI tests in v1. See the `unit-testing` skill for conventions. Tests must pass before merging a branch into `main`.

Coverage was originally audited against the spec's exact required list (§14: macro math, per-serving↔per-100g normalization, BMR/TDEE/BMI, unit↔gram conversion, the suggestion scorer). The Spoonacular-ingestion-specific tests (`src/lib/ingestion/*.test.ts`) were removed along with the pipeline itself (see Recipes & Suggestions API above) — 35 tests remain, all passing, covering everything except ingestion, which no longer exists.

## RTL conventions

The UI is Hebrew-only, `dir="rtl"`. Use Tailwind logical properties everywhere (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`) — never physical ones (`ml-*`/`mr-*`/`left-*`/`right-*`/`text-left`/`text-right`). All UI strings live in `src/lib/strings.ts`; no inline Hebrew literals in components. See the `frontend-ui-ux` skill for the full conventions (mobile-first, shadcn/ui usage, component reuse) that apply to any UI work.

## UI: Today screen

The first UI screen (`src/app/page.tsx`) is the daily diary: date navigation, per-macro progress bars against the active goal, meal-grouped entries, and an add-food dialog. Built on [shadcn/ui](https://ui.shadcn.com) (`@base-ui/react` primitives, `components.json` has `"rtl": true` so generated components come out RTL-safe) — run `npx shadcn@latest add <component>` to pull in more.

- `src/lib/auth/current-user.ts` — `getCurrentUser()` lets a Server Component read the same verified `x-user-id`/`x-user-email` headers `proxy.ts` attaches, without re-deriving auth logic.
- `src/lib/diary/get-day.ts` — `getDiaryDay(userId, date)` is the single query path shared by `GET /api/diary` and the Today page, so there's no duplicate DB logic and no HTTP round-trip from the Server Component.
- `src/components/diary/` — `DateNav` (client, RTL-flipped chevrons: "previous day" is a rightward chevron since the reading/timeline direction is flipped), `MacroProgress`, `EntryList` + `DeleteEntryButton`, `AddFoodDialog` (debounced product search → quantity/meal select → `POST /api/diary`).
- Unauthenticated **page** requests now redirect to `/login?from=<path>` (`src/proxy.ts`); unauthenticated **API** requests still get a JSON 401/403, distinguished by whether the path starts with `/api/`.
- Both `proxy.ts`'s redirect and `/api/login`'s post-login redirect build the target URL from the request's `Host` header (not `request.url`/`request.nextUrl`, which Next can normalize to `localhost`) — otherwise logging in from a phone over the LAN IP/Tailscale address bounces back to `localhost` instead of staying on the address the phone actually used.

To test on a phone: the dev server binds Next's printed "Network" address to a Docker/WSL virtual adapter, not your real LAN IP — find the actual IPv4 via `ipconfig` (Wi-Fi adapter) and browse to `http://<that-ip>:3000` from a device on the same Wi-Fi, or use the Tailscale address for remote access (see Mobile / remote access above).

**Resolved: iOS dev-mode button unresponsiveness.** Earlier testing found that on iOS (Safari and Chrome, which shares Safari's WebKit engine there), pages rendered styled correctly but buttons/dialogs didn't respond, while plain `<a href>` nav links still worked — pointing to a hydration/JS-execution failure specific to `npm run dev` accessed over a LAN IP rather than `localhost`. Confirmed dev-mode-specific by testing a real `next build` standalone production server (no Turbopack, no HMR) over the same LAN IP on the same iPhone: buttons worked correctly. Root cause not pinned to the exact mechanism (Turbopack's dev-mode HMR websocket failing silently on a non-localhost origin in WebKit is the leading theory), but the practical takeaway is: **use a production build for real on-device testing**, not `npm run dev`, when testing over the LAN rather than on the same machine as the dev server. `next start` doesn't work with this project's `output: "standalone"` config (`next.config.ts`) — run `node .next/standalone/server.js` instead after copying `.env`, `public/`, and `.next/static` into `.next/standalone/` (the same steps `docker/Dockerfile`'s entrypoint already does for the real deployment).

## UI: Products screen

`src/app/products/page.tsx` — search/filter the shared product library, create/edit via a dialog, archive via a confirmation dialog. `src/lib/products/get-products.ts` (`getProducts(q, filter)`) is the single query path shared by `GET /api/products` and this page, same pattern as `getDiaryDay`.

- `src/components/products/product-form-dialog.tsx` — one `ProductFormDialog` handles both create (`POST /api/products`) and edit (`PATCH /api/products/:id`), keyed off an optional `productId` prop. A `kcal_mismatch` warning from the API doesn't block the save (the row is already written) — the dialog stays open and shows the warning rather than implying the save failed.
- `src/components/products/product-search-bar.tsx` — debounced search input + filter `Select`, both drive the page via URL search params (`?q=&filter=`) so the page itself stays a Server Component.
- `src/components/products/archive-product-button.tsx` — archive is soft-delete (`POST /api/products/:id/archive`) behind an `AlertDialog` confirmation, since it's not reversible from the UI.
- `src/components/app-nav.tsx` — simple top nav linking Today ↔ Products; added per-page rather than in the root layout since `/login`/`/forbidden` shouldn't show it.

**Conditional background rendering bug:** `Dialog`/`AlertDialog`/`Select` popups (`bg-popover`) and later `RadioGroup`/`Switch` checked states (`data-checked:bg-primary`) all rendered with no visible fill in this dev environment, even though the class was present and the underlying state (`aria-checked`, `onValueChange`) was confirmed correct via console logging. Narrowed to: any Tailwind `data-[attr]:bg-<theme-token>` conditional utility fails to resolve, while plain unconditional `bg-<token>` (e.g. `Badge`'s default `bg-primary`) renders fine. Fixed by replacing the conditional token class with an explicit color pair (`data-checked:bg-primary` → `data-checked:bg-neutral-900 dark:data-checked:bg-neutral-100`, `bg-popover` → `bg-white dark:bg-neutral-900`) on `Dialog`, `AlertDialog`, `Select`, `Popover`, `RadioGroup`, and `Switch`. See the `frontend-ui-ux` skill for the full pattern — apply it to any new component with a `data-*:`-gated background before shipping.

**Field help text:** `src/components/field-hint.tsx` — a small ⓘ icon (tap/click-to-open `Popover`) for form fields whose label doesn't fully explain them (e.g. the product form's "serving description" vs. the always-required per-100g macros). Used instead of an always-visible help line for hints that are secondary/would clutter the form. See the `frontend-ui-ux` skill for when to use an always-visible line vs. this icon pattern.

**`DialogTrigger`/`AlertDialogTrigger` hydration mismatch:** composing either with `render={<Button />}` (the pattern every dialog trigger in this app uses) produced a recurring, non-blocking React hydration warning — the trigger's own hardcoded `data-slot` and the rendered `Button`'s own `data-slot` disagreed between the server and client render passes. Fixed by only setting the trigger's own `data-slot` when *not* composing through `render` (`src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx`) — when `render` is set, the composed element's own `data-slot` is what actually lands in the DOM anyway.

## UI: Profile & Goals screen

`src/app/profile/page.tsx` — sets the profile fields BMI/BMR/TDEE depend on, logs weight, and lets the user save a daily macro goal. This is what unblocks the Today screen's progress bars (previously always "no target set" — nothing in the UI could create a `goals` row until this screen existed).

- `src/components/profile/profile-form.tsx` — sex (`RadioGroup`), birth date, height, activity level (`Select`), notifications toggle (`Switch`), and an optional weight-log input, all in one `POST /api/profile` call. Logging weight for a date that already has an entry updates it in place (server-side upsert on `(user_id, logged_on)`) rather than creating a duplicate — the form doesn't need to know or care which case it is.
- `src/components/profile/goal-panel.tsx` — calls `GET /api/bmi?goalType=` whenever the goal-type selector changes, showing BMI/BMR/TDEE and a calculated macro split pre-filled into editable fields; "Save goal" always posts whatever is currently in those fields (calculated-as-is or hand-edited) to `POST /api/goals`. Renders nothing but an explanatory message until the profile is complete (`sex`/`birthDate`/`heightCm`/`activityLevel` set and at least one weight log) — matches `GET /api/bmi`'s own `400 incomplete_profile`/`no_weight_log` guards, so the UI never shows a broken calculation.
- Since `goals` is append-only (see Profile, BMI & Goals API above), saving a new goal here doesn't edit the currently-active one — it adds a new row effective today. The panel shows the currently-active goal (if any) above the form so the user can see what they're changing before they save.

## UI: Recipes & Suggestions screens

`src/app/recipes/page.tsx` (list), `src/app/recipes/[id]/page.tsx` (detail), `src/app/suggestions/page.tsx`. `src/lib/recipes/get-recipes.ts` and `src/lib/recipes/get-recipe-detail.ts` are the shared query paths behind both the API routes and these pages, same pattern as products/diary. `src/lib/suggestions/get-suggestions.ts` extracts what was previously logic embedded directly in `GET /api/suggestions` — now shared with the Suggestions Server Component.

- `src/components/recipes/recipe-form-dialog.tsx` — one dialog handles both create (`POST /api/recipes`) and edit (`PATCH /api/recipes/:id`), with a dynamic list of `IngredientRow`s (`src/components/recipes/ingredient-row.tsx`, each with its own debounced product search, same pattern as `AddFoodDialog`). Save is disabled until there's a name and at least one ingredient with both a resolved product and a quantity. Description/instructions use `Textarea`, not `Input` — both are naturally multiline text.
- **Two entry modes**, toggled at the top of the create dialog (edit only ever uses the manual form): **manual** (the form as described above) and **paste** (a `Textarea` for pasted recipe text + "פירוק לרכיבים" button calling `POST /api/recipes/parse`). A successful parse switches to manual mode with every field pre-filled — including ingredient rows built from the parsed lines, each with `productId` deliberately empty (`IngredientRow`'s `parsedText` prop shows what the model actually read, e.g. "2 cups flour", as a hint above the search box). An amber "unmatched" badge and border (`IngredientRow`'s `isUnmatched` state) marks any ingredient without a resolved product, and a banner above the list reminds the user every ingredient needs manual matching before saving — nothing is ever auto-matched, since the parse step has no access to the product library.
- `src/components/recipes/delete-recipe-button.tsx` — delete goes through an `AlertDialog` confirmation; a `409 in_use` response (the recipe is referenced by a diary entry) is caught and shown inline rather than surfacing as a generic failure.
- **Bug fixed:** `IngredientRow`'s product search returned empty results for realistic short/single-word queries (e.g. "טונה" against a product named "נתחי טונה בהירה בשמן" scores ~0.25 on `pg_trgm`'s default 0.3 similarity threshold — below the cutoff despite being an exact substring match). `getProducts` (`src/lib/products/get-products.ts`) now falls back to a plain `ILIKE` substring match alongside the trigram similarity check, so any partial-word search finds the product regardless of trigram score.
- `src/components/suggestions/suggestion-card.tsx` — each of the top-5 ranked candidates (recipe + serving multiplier) has its own meal-type selector and a "log this" button that posts directly to `POST /api/diary` with `{recipeId, servings}`, mirroring `AddFoodDialog`'s product-entry flow. No goal set yet → the whole suggestions list is replaced with an explanatory message instead of an empty/broken state, matching `GET /api/suggestions`'s own `400 no_goal` guard.
- `AppNav` (`src/components/app-nav.tsx`) now has 5 items and scrolls horizontally (`overflow-x-auto`) rather than wrapping — needed once the nav grew past what reliably fits a phone-width screen without wrapping to a second line.

## UI: Image extraction (add product from photo)

`src/app/products/extract/page.tsx` hosts `src/components/products/extraction-flow.tsx`, a single client component driving the whole upload → poll → review → confirm flow as a small state machine (`idle` → `uploading` → `polling` → `review` → `saved`), reachable from a "הוספה מתמונה" button on the Products screen.

- Upload posts multipart form data straight to the existing `POST /api/products/extract` (unchanged from Phase 7) and polls `GET /api/products/extract/:jobId` every 1.5s (up to 30 attempts) until `status` leaves `pending`/`processing`. The photo preview during review uses a local `URL.createObjectURL(file)` (no round-trip needed since the file is already in memory) rather than the new image-serving route below.
- New: `GET /api/products/extract/:jobId/image` serves the downscaled, stored label photo back to the browser (ownership-checked the same way as the job itself) — added specifically so a review screen could show the photo, since nothing previously served `data/uploads/*` back out. Not used by the upload flow itself (which already has the file in memory as a blob), but available for revisiting a job's review screen later without re-uploading.
- The review form pre-fills every field from the job's `parsed` result (already normalized to per-100g server-side in Phase 7's `processExtractionJob`) and is fully editable before save — matching the spec's "model never writes a product row directly" rule: `POST /api/products` with `extractionJobId` set *is* the human confirmation step, same as it always was, just now reachable by clicking through a screen instead of curl.
- If a per-serving label had no detectable serving size (Phase 7's known "not a failure" case), the review screen shows an explanatory banner telling the user to supply a serving size or enter values manually — the raw per-serving numbers are left in the per-100g fields as a starting point, not silently treated as already-correct.
- A `failed` job shows the error and a "retry" button wired to the existing `POST /api/products/extract/:jobId/retry` (re-processes the already-stored image, no re-upload).
- Verified end-to-end with a real (non-mocked) Claude Sonnet 5 call against a synthetically generated per-100g label image: extraction returned exact values (250 kcal, 12g protein, 30g carbs, 10g fat, `confidence: "high"`), confirm-and-save created a product with `source: "image"` and `isVerified: true`, and retry re-processed the same stored image successfully.

## UI: Polish pass

A dedicated audit of every screen for three specific gaps: silent-failure mutations, missing loading feedback, and missing empty states.

**Silent-failure mutations fixed:** `DeleteEntryButton`, `ArchiveProductButton`, `AddFoodDialog`, `ProfileForm`, `GoalPanel`, `SuggestionCard`, and `ProductFormDialog` all previously had an `if (res.ok) {...}` mutation handler with no `else` — a failed delete/archive/save request left the UI looking exactly like nothing had happened, with no indication anything went wrong. Each now sets a `strings.common.genericError` message on failure (`RecipeFormDialog` additionally distinguishes a `not_found` product-reference error with its own message, `strings.recipes.productNotFoundError`, since "please pick a different product" is more actionable than a generic error there). Confirm/save buttons that lacked a pending-state label swap now show `strings.common.saving` while a mutation is in flight, matching the pattern `AddFoodDialog`/`RecipeFormDialog`'s create flow already used.

**Mobile-width truncation bug:** `ProductListItem`'s product-name `span` had `truncate` but no `min-w-0` on its *immediate* flex parent (a nested `flex items-center gap-2` row holding the name + a verified/unverified `Badge`) — `truncate` silently does nothing without a flex ancestor that can actually shrink below its content's natural width, so a long product name pushed the badge (and, in the outer row, the edit/archive buttons) off-screen on a phone instead of ellipsizing. `EntryList`'s diary-entry name had the same gap (no `min-w-0` at all). Both fixed. See the `frontend-ui-ux` skill for the general rule: `truncate` requires `min-w-0` on the flex row it's *directly* inside, not just somewhere up the ancestor chain.
