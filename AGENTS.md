<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentation

Keep the project documented as you work. Use the `code-documentation` skill to write and update API docs, READMEs, and inline comments whenever you add or change functionality.

# Git workflow

Use the `git-workflow` skill for branching, committing, merging, and pushing conventions.

# Mobile device testing

`npm run dev` (Turbopack) does not work reliably on iOS Safari/Chrome when accessed over a non-`localhost` address — buttons and dialogs silently fail to respond (confirmed dev-mode-specific; a production build over the same address on the same device works correctly). Whenever mobile testing is needed, spin up a production build instead of dev mode:

```bash
npm run build
npm run start   # scripts/start-prod.sh: prepares .next/standalone/ and
                 # serves on PORT (default 3100, distinct from dev's 3000
                 # so both can run at once) — next start does not work
                 # with this project's output: "standalone" config
```

Find the host machine's real LAN IPv4 via `ipconfig` (the Wi-Fi adapter's address, not the Docker/WSL virtual adapter Next prints as "Network"), or its Tailscale address (`tailscale ip`) for access from outside the LAN, and tell the user the exact URL to open on their phone, e.g. `http://192.168.x.x:3100` or `http://100.x.x.x:3100`.
