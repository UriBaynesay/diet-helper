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

## Guardrails specific to this app

- Don't reintroduce Docker (or any other infra) here speculatively — wait
  for it to come up as the real next step per the root CLAUDE.md's process.
- `AGENTS.md`'s existing conventions (documentation via `code-documentation`
  skill, git workflow via `git-workflow` skill, production-build mobile
  testing) still apply and predate this project — don't override them
  without reason.
