#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set." >&2
  exit 1
fi
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: restore.sh <scope-backup.dump>" >&2
  exit 1
fi

pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --exit-on-error "$1"
echo "Scope backup restored. Restart Scope so pending migrations can run."
