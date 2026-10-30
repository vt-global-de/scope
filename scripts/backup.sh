#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set." >&2
  exit 1
fi

output="${1:-scope-$(date -u +%Y%m%dT%H%M%SZ).dump}"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --file="$output"
echo "Scope backup written to $output"
