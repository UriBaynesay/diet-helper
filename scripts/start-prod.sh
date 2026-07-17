#!/usr/bin/env bash
# Runs the already-built standalone production server on a dedicated port,
# separate from `npm run dev`'s port — meant to stay running alongside dev
# for real on-device use (see AGENTS.md: `next dev` doesn't work reliably
# on iOS Safari/Chrome over the LAN/Tailscale).
#
# `next start` does not work with this project's `output: "standalone"`
# config, so this copies the pieces `next build` doesn't put in
# .next/standalone/ on its own (.env, public/, .next/static) and runs the
# standalone server.js directly.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PROD_PORT:-3100}"

if [ ! -d ".next/standalone" ]; then
  echo "No .next/standalone build found — run 'npm run build' first." >&2
  exit 1
fi

cp .env .next/standalone/.env
cp -r public .next/standalone/public 2>/dev/null || true
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

cd .next/standalone
PORT="$PORT" node --env-file=.env server.js
