<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentation

Keep the project documented as you work. Use the `code-documentation` skill to write and update API docs, READMEs, and inline comments whenever you add or change functionality.

# Git workflow

- Do all work for a feature or fix on its own branch — never commit directly to `main`.
- Branch off `main` with a descriptive name (e.g. `feature/x`, `fix/y`).
- When the work on a branch is complete and verified, commit it. Ask for confirmation before merging into `main` — do not merge automatically.
- Once confirmed, merge with a regular merge commit (no squash) and delete the feature branch (local, and remote if it was pushed).
- After merging to `main`, ask for confirmation before pushing `main` to GitHub — do not push automatically.
