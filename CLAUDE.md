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

- **Runs via** `npm run dev` (Turbopack) and, for production/mobile testing,
  `npm run build && npm run start` (see `AGENTS.md` — dev mode is broken on
  iOS Safari/Chrome over non-localhost addresses; the standalone prod build
  is not).
- **Postgres runs via `docker-compose.yml`, Postgres only — the app stays
  native.** `docker compose up -d` starts just the database, published on
  `localhost:5432`; the app (via `npm run dev`/`start`) connects to that
  like any local Postgres, unaware it's a container. The app itself is
  deliberately *not* containerized yet — see "Why Postgres-only" below.
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

## Docker was removed, then Postgres-only was rebuilt deliberately

This app arrived with a working `docker-compose.yml` (app + Postgres,
health checks, volumes for uploads/backups) built independently, before this
project's gradual/felt-limitation process existed. It was removed on move-in
(commit "Remove Docker setup") rather than kept, because it wasn't arrived
at through that process. Once "no database" became the actual felt
limitation, `docker-compose.yml` was rebuilt from scratch (not copied from
git history) — see the Infra Knowledge doc's Docker entry (Containers /
Images / Mounts → Volumes / Compose subsections) for the concepts underlying
every line of it.

- **Why Postgres-only, not the app too.** Containerizing the app is a
  separate, materially bigger topic (Dockerfile, multi-stage build for
  Next.js's standalone output, build-time vs. runtime env vars) and would
  also require reworking the existing LAN/Tailscale mobile-testing workflow
  in `AGENTS.md`. Deferred to its own future step with its own trigger —
  don't bundle it in when a smaller, focused change solves the actual gap.
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
- **`DATABASE_URL` in `.env`/`.env.example` already assumed this exact
  shape** (`localhost:5432` for host-side dev, a comment noting the app
  container would instead get `postgres:5432` if it ever joins this
  compose file) — nothing needed to change there.

## Guardrails specific to this app

- Don't reintroduce Docker (or any other infra) here speculatively — wait
  for it to come up as the real next step per the root CLAUDE.md's process.
- `AGENTS.md`'s existing conventions (documentation via `code-documentation`
  skill, git workflow via `git-workflow` skill, production-build mobile
  testing) still apply and predate this project — don't override them
  without reason.
