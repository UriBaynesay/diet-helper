<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentation

Keep the project documented as you work. Use the `code-documentation` skill to write and update API docs, READMEs, and inline comments whenever you add or change functionality.

# Git workflow

Use the `git-workflow` skill for branching, committing, merging, and pushing conventions.

# Mobile device testing

`npm run dev` (Turbopack) does not work reliably on iOS Safari/Chrome when accessed over the LAN IP from a phone — buttons and dialogs silently fail to respond (confirmed dev-mode-specific; a production build over the same LAN IP on the same device works correctly). Whenever mobile testing is needed, spin up a production build instead of dev mode:

```bash
npm run build
cp .env .next/standalone/.env
cp -r public .next/standalone/public
rm -rf .next/standalone/.next/static && cp -r .next/static .next/standalone/.next/static
cd .next/standalone && node server.js
```

(`next start` does not work with this project's `output: "standalone"` config — use `node .next/standalone/server.js` directly, as above.)

Find the host machine's real LAN IPv4 via `ipconfig` (the Wi-Fi adapter's address, not the Docker/WSL virtual adapter Next prints as "Network") and tell the user the exact URL to open on their phone, e.g. `http://192.168.x.x:3000`.
