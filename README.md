# diet-helper

Personal Hebrew-RTL diet-tracking web app. Runs on the owner's PC, reachable from anywhere via a Cloudflare Tunnel behind Cloudflare Access. See `diet-helper-functional-spec.md` for the full product/technical spec.

## Stack

Next.js 16 (App Router) + TypeScript, PostgreSQL + Drizzle ORM, Tailwind CSS v4, Cloudflare Access (JWT) for auth, Docker Compose (app + Postgres + `cloudflared`).

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

## Auth in development

Production auth is Cloudflare Access: `src/proxy.ts` verifies the `Cf-Access-Jwt-Assertion` JWT against Cloudflare's JWKS, then checks the verified email against the `users` allowlist table (`is_allowed = true`). There's no local Cloudflare Access app to test against during development, so `src/proxy.ts` has a **dev-only bypass**: when `NODE_ENV=development`, an `x-dev-user-email` header is trusted in place of a verified JWT. This path is hard-gated on `NODE_ENV` and never active in production.

```bash
curl -H "x-dev-user-email: you@example.com" http://localhost:3000/api/whoami
```

The email must match a seeded, allowed user or you'll get a 403.

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
| GET | `/api/products?q=&filter=` | Fuzzy search on `name` via `pg_trgm`. `filter`: `all` \| `manual` \| `image` \| `ingested` \| `unverified` |
| POST | `/api/products` | Create |
| PATCH | `/api/products/:id` | Partial update |
| POST | `/api/products/:id/archive` | Soft-delete |

All routes require auth (same Cloudflare Access / dev-bypass flow as above). Requests and responses follow the app-wide `{ data }` / `{ error: { code, message } }` shape (`src/lib/api-response.ts`).

Validation (`src/lib/products/schema.ts`, Zod): all macros must be `>= 0`. A product's macros are also checked against its stated `kcalPer100g` (`4*protein + 4*carbs + 9*fat`) — a mismatch over 15% does **not** block the write, it returns `warning: "kcal_mismatch"` alongside the saved product so the caller can flag it for review instead of losing the data.

**Known gap:** seed data for ~100 common Israeli staples (spec §11.3's bootstrapping suggestion) is deferred — no nutrition data source has been chosen yet.

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

`recipes` and `recipe_ingredients` are shared across users, like `products` — no per-user filtering. A recipe has a `status` (`draft` | `ready` | `rejected`); only `ready` recipes are loggable or suggestable. Manually-created recipes go straight to `ready` since every ingredient always has a `productId` + `quantityG` by construction — the `draft` state and the `raw_text`/`parsed_*`/`match_confidence` columns on `recipe_ingredients` exist for the ingestion pipeline (phase 8) and are unused until then.

`recipe_nutrition` is a **SQL view**, not a table — sum of ingredient macros ÷ servings, derived and never stored. It's created by a raw-SQL migration (`drizzle/migrations/0005_recipe_nutrition_view.sql`) and mapped read-only into Drizzle via `.existing()` (`src/db/schema/recipe-nutrition.ts`) so drizzle-kit doesn't try to manage or recreate it.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/recipes?status=` | List, optionally filtered by status |
| POST | `/api/recipes` | Create a recipe + its ingredients in one call |
| GET | `/api/recipes/:id` | Recipe + ingredients + derived nutrition |
| PATCH | `/api/recipes/:id` | Partial update; replaces the ingredient list if `ingredients` is provided |
| DELETE | `/api/recipes/:id` | Hard delete — blocked with `409 in_use` if a diary entry references it (same "can't remove what's referenced" rule as products, enforced by the FK and caught cleanly) |
| GET | `/api/suggestions?date=` | Top 5 ranked recipe servings for what's left of that day's target |

`GET /api/suggestions` computes remaining macros (active goal − today's consumed, via the same `findActiveGoal` lookup `/api/goals` uses), scores every `ready` recipe's half/single/double-serving candidates with a deterministic weighted-deviation formula (`src/lib/suggestions/scorer.ts`, pure and unit-tested — protein weighted 2.0, kcal 1.5, carbs/fat 1.0, lower score is better), and hard-filters out anything more than 20% over remaining kcal or referencing an archived product. Verified via curl: archiving a recipe's ingredient product removes it from suggestions; logging a recipe reduces the remaining macros used by later suggestion calls; a recipe closer to the remaining macros consistently outranks a worse match at the same calorie level.

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

## Environment variables

See `.env.example` for the full list. Notes:
- `DATABASE_URL` in `.env` is for host-side tooling (`npm run dev`, `db:migrate`, seed script). Inside `docker-compose.yml`, the `app` service overrides this to point at the `postgres` service hostname instead of `localhost`.
- `CRON_SECRET` guards `/api/cron/*` routes — these are excluded from Cloudflare Access verification entirely (an OS scheduler calls them locally with no JWT) and are protected by this shared secret instead. The guard (`src/lib/cron/guard.ts`) also rejects any request carrying Cloudflare forwarding headers, so these routes can't be reached through the tunnel even with the correct secret.
- `OWNER_EMAIL` is only read by `scripts/seed-owner.ts`, never by the app itself.

## Running the full stack

```bash
docker compose up
```

Starts `postgres`, `app` (migrates on boot, then serves), and `cloudflared` (requires a real `CLOUDFLARE_TUNNEL_TOKEN` — without one it will fail to connect, which is expected until a tunnel is provisioned in the Cloudflare dashboard).

## Tests

```bash
npm test   # vitest run
```

Unit tests cover the pure calculation functions only (macro math, BMI/BMR/TDEE, sanity checks) — no DB/UI tests in v1. See the `unit-testing` skill for conventions. Tests must pass before merging a branch into `main`.

## RTL conventions

The UI is Hebrew-only, `dir="rtl"`. Use Tailwind logical properties everywhere (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`) — never physical ones (`ml-*`/`mr-*`/`left-*`/`right-*`/`text-left`/`text-right`). All UI strings live in `src/lib/strings.ts`; no inline Hebrew literals in components.
