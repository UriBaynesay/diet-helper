---
name: unit-testing
description: Generate and run unit tests for this project's pure calculation functions. Use whenever new or changed pure logic is added (macro math, per-serving/per-100g normalization, BMR/TDEE/BMI, unit-to-gram conversion, the suggestion scorer, validation/sanity-check helpers), and always before merging a feature branch to main.
---

# Unit testing

This project uses **Vitest** (`npm test` runs `vitest run`). Config: `vitest.config.ts` (resolves the `@/` path alias, picks up `src/**/*.test.ts`).

## What to test

Per the spec's non-functional requirements, unit tests are required for **pure calculation functions** — anything that takes inputs and deterministically returns a value, with no DB/network/filesystem access:
- Macro math (e.g. `macrosForQuantity`)
- Per-serving ↔ per-100g normalization
- BMR / TDEE / BMI formulas
- Unit → gram conversion
- The meal-suggestion scorer
- Validation/sanity-check helpers (e.g. `kcalSanityWarning`)

**Do not** write tests for API route handlers, database queries, or UI — no integration or UI tests in v1. If a route handler is more than a thin wrapper around a pure function, extract the pure part into `src/lib/**` and test that.

## Conventions

- Co-locate: `src/lib/foo/bar.ts` → `src/lib/foo/bar.test.ts`.
- Use `describe`/`it`/`expect` from `vitest`.
- Prefer literal expected values over re-deriving the formula under test (a test that recomputes the same math as the code can't catch a shared mistake).
- Cover: the spec's own worked examples/acceptance criteria first (they're already-agreed correct answers), then boundary cases (zero, negative-rejected-elsewhere, exact threshold values).
- Keep tests fast and hermetic — no real DB connection, no network. Mock/inline any data the function needs.

## Workflow

1. When you add or change a pure calculation function, write or update its test file in the same step — not as a follow-up.
2. Run `npm test` and confirm all tests pass before considering the work done.
3. The `git-workflow` skill runs `npm test` as part of pre-merge verification — a red suite blocks asking for merge confirmation. Fix the code or the test before proceeding, never skip or delete a failing test to get past this gate.
