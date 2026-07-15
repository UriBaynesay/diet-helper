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

`recipes` and `recipe_ingredients` are shared across users, like `products` — no per-user filtering. A recipe has a `status` (`draft` | `ready` | `rejected`); only `ready` recipes are loggable or suggestable. Manually-created recipes go straight to `ready` since every ingredient always has a `productId` + `quantityG` by construction. Ingested recipes (see Recipe Ingestion below) land as `draft` and use the `raw_text`/`parsed_*`/`match_confidence` columns on `recipe_ingredients`.

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

## Recipe Ingestion API

**Source: Spoonacular**, chosen over scraping an Israeli site's JSON-LD (the spec's own open question, §16.1). Spoonacular returns ingredients already parsed into `{amount, unit, name}`, which collapses the ingredient-line-parsing step a Hebrew source would need — the tradeoff is English-language recipes, not Israeli home cooking. The 3-tier product matching and human mapping-review queue below still fully apply, since Spoonacular's ingredient *names* still need to map onto this app's own product library.

New tables: `unit_conversions` (`unit`, nullable `ingredient_pattern` — a specific pattern beats the generic unit, `grams`), seeded with ~40 common US cooking measures via `npm run db:seed-unit-conversions` (generic: cup/tbsp/tsp/oz/lb/etc; ingredient-specific: `cup`+`flour` = 120g, overriding the generic `cup` = 240g). `ingest_runs` (`source_name`, `status`, `recipes_found`/`created`/`skipped`, `error`) — one row per run, for audit and idempotency.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/cron/ingest-recipes` | Fetches a page of Spoonacular recipes, dedupes by `external_id` (`spoonacular:{id}`), creates/updates an `ingest_runs` row |
| GET | `/api/recipes/mapping-queue` | Unmatched/low/medium-confidence ingredient lines, grouped by parsed ingredient name |
| POST | `/api/recipes/mapping` | `{ingredientName, action: "link"|"ignore", productId?}` — fixing one name fixes every recipe using it |
| GET / POST | `/api/unit-conversions` | List / add a conversion rule |

Guarded the same way as the other cron routes (`X-Cron-Secret`, excluded from Cloudflare Access).

**3-tier product matching** (`src/lib/ingestion/match-product.ts`), cheapest first: `pg_trgm` similarity ≥ 0.6 auto-links at `high` confidence; ≥ 0.35 auto-links but flagged `medium` for review; below that, Claude Haiku 4.5 picks from the top-20 trigram candidates (or returns no match) — capped at `medium` even on an LLM-confirmed match, since it always goes to human review, never auto-approved. The model is constrained to only ever return a `product_id` literally present in the supplied shortlist — it can't invent a product, the same guardrail the image-extraction pipeline applies to nutrition values.

A recipe promotes `draft` → `ready` only when **every** ingredient is resolved: either `(product_id AND quantity_g)` are both set, or the ingredient was explicitly marked ignorable (`quantity_g = '0'`, e.g. "additional toppings" or a count-based unit like "3 large carrots" with no gram equivalent) — spec §11.2 step 5's "real ingredient, contributes nothing" case. This check is one shared function (`src/lib/ingestion/promote-recipe.ts`) used by both the ingest pipeline and the mapping endpoint.

**Bug found and fixed during testing:** the original promotion check required `product_id IS NOT NULL` for *every* ingredient, which meant "ignore" could never actually unblock a recipe — contradicting the spec's own intent. Fixed and re-verified.

Verified end-to-end with real Spoonacular + Claude Haiku calls (not mocked): first ingest run fetched 20 recipes, created all 20 (all landed `draft` — the product library starts empty, the spec's own "bootstrapping problem," §11.3); a second run against the same page skipped all 20 and created 0, matching the spec's "a second run creates zero duplicate recipes" acceptance criterion exactly. Ingredients showed up correctly grouped in the mapping queue (e.g. "carrots" grouped across 4 different recipes); linking one product mapping updated all 4 recipes' carrot lines in a single call and promoted the recipes that were blocked only by it — matching the spec's acceptance criterion word for word. Also verified: missing `X-Cron-Secret` → 401.

No mapping-review UI yet — API only, same pattern as every prior phase.

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

Guarded the same way as `/api/cron/ping` — `X-Cron-Secret` + rejection of any Cloudflare forwarding header (`src/lib/cron/guard.ts`), **not** Cloudflare Access. Iterates every user with `is_allowed = true AND notifications_enabled = true` (a user failing either check is excluded from the query entirely, not merely skipped).

For each eligible user, "today" is resolved in *that user's* `timezone` via `Intl.DateTimeFormat` (`src/lib/notifications/timezone.ts`) — never the container's UTC clock — then the route attempts today's summary and, separately, yesterday's (**catch-up**, in case the PC was asleep at the scheduled time; never further back than one day). Each attempt is idempotent: `send-daily-summary.ts` checks `notification_logs` for an existing `status = 'sent'` row for that user/date first, and skips cleanly (no email, no duplicate log) if already sent, if the day has zero diary entries, or if there's no active goal for that date.

Email is sent via Nodemailer over Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) using `GMAIL_USER`/`GMAIL_APP_PASSWORD` — a real **Gmail App Password**, which requires 2-Step Verification enabled on the account. Subject and verdict copy are pure, tested functions (`src/lib/notifications/summary.ts`) matching the spec's own worked examples exactly.

**RTL email gotcha found during testing:** `dir="rtl"` on `<html>`/`<body>` alone is not enough for Gmail — every text-bearing table cell needs its own explicit `dir="rtl"` attribute, and numeric "consumed / target unit" pairs need to be wrapped in `dir="ltr"` spans or the numbers render reversed (same rule the spec gives for the app UI, extended here to email). The template (`src/lib/notifications/template.ts`) was iterated once on real visual feedback into a rounded card with a circular kcal-percent indicator, per-macro progress bars, and a pill CTA button — verified by actually receiving and reading real test emails in Gmail, including the catch-up variant's amber "sent late" banner.

Verified via curl + live email delivery: calling the endpoint twice for the same day sent exactly one email (one `notification_logs` row); a diary entry logged for yesterday plus a backdated goal triggered a real catch-up email labeled for the correct date; `notifications_enabled = false` excludes the user with an empty result and no email; missing/wrong `X-Cron-Secret` both 401; a day with zero diary entries is skipped with no email sent.

## Environment variables

See `.env.example` for the full list. Notes:
- `DATABASE_URL` in `.env` is for host-side tooling (`npm run dev`, `db:migrate`, seed script). Inside `docker-compose.yml`, the `app` service overrides this to point at the `postgres` service hostname instead of `localhost`.
- `CRON_SECRET` guards `/api/cron/*` routes — these are excluded from Cloudflare Access verification entirely (an OS scheduler calls them locally with no JWT) and are protected by this shared secret instead. The guard (`src/lib/cron/guard.ts`) also rejects any request carrying Cloudflare forwarding headers, so these routes can't be reached through the tunnel even with the correct secret.
- `OWNER_EMAIL` is only read by `scripts/seed-owner.ts`, never by the app itself.
- `GMAIL_USER`/`GMAIL_APP_PASSWORD` (a Gmail App Password, not the account password — requires 2-Step Verification) and `APP_URL` (used for the "open the app" link in the daily summary email) are required at runtime by `src/lib/env.ts` once the notifications cron route is hit.
- `ANTHROPIC_API_KEY` is required at runtime by `src/lib/env.ts` once the image-extraction route (`/api/products/extract`) is hit.
- `SPOONACULAR_API_KEY` is required at runtime by `src/lib/env.ts` once the ingest cron route (`/api/cron/ingest-recipes`) is hit.

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
