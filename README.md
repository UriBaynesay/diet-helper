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

## RTL conventions

The UI is Hebrew-only, `dir="rtl"`. Use Tailwind logical properties everywhere (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`/`text-end`) — never physical ones (`ml-*`/`mr-*`/`left-*`/`right-*`/`text-left`/`text-right`). All UI strings live in `src/lib/strings.ts`; no inline Hebrew literals in components.
