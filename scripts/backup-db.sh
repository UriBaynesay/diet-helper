#!/bin/sh
# Run from the host (via the OS scheduler, alongside the other cron jobs —
# see README "Backups"). Dumps the Dockerized Postgres via `docker exec`,
# since pg_dump lives in the postgres image, not the app image.
set -e

CONTAINER="${POSTGRES_CONTAINER:-diet-helper-postgres-1}"
DB_USER="${POSTGRES_USER:-diet_helper}"
DB_NAME="${POSTGRES_DB:-diet_helper}"
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/data/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
  > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

echo "Backup written to $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

# Keep the last 30 backups; a personal-app local backup isn't meant to be
# an unbounded archive.
ls -1t "$BACKUP_DIR"/*.sql 2>/dev/null | tail -n +31 | xargs -r rm --
