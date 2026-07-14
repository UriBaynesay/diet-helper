#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/tsx/dist/cli.mjs src/db/migrate.ts

echo "Starting server..."
exec node server.js
