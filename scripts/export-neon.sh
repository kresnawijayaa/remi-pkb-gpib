#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
umask 077
mkdir -p backups

if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
  read -r -s -p 'Masukkan DATABASE_URL Neon (input disembunyikan): ' NEON_DATABASE_URL
  printf '\n'
fi
if [[ "$NEON_DATABASE_URL" != postgres://* && "$NEON_DATABASE_URL" != postgresql://* ]]; then
  printf 'Connection string PostgreSQL tidak valid.\n' >&2
  exit 1
fi
export NEON_DATABASE_URL
dump_file="backups/neon-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
temporary_file="${dump_file}.partial"
trap 'rm -f -- "$temporary_file"; unset NEON_DATABASE_URL' EXIT

# PostgreSQL 18 dapat mengekspor server PostgreSQL versi <=18.
docker run --rm --env NEON_DATABASE_URL postgres:18-alpine sh -c \
  'exec pg_dump "$NEON_DATABASE_URL" --schema=public --format=custom --no-owner --no-acl' > "$temporary_file"
test -s "$temporary_file"
docker run --rm -i postgres:18-alpine pg_restore --list < "$temporary_file" > /dev/null
mv -- "$temporary_file" "$dump_file"
docker run --rm --env NEON_DATABASE_URL \
  --mount "type=bind,src=$(pwd)/deploy/verify-data.sql,dst=/verify-data.sql,readonly" \
  postgres:18-alpine sh -c \
  'exec psql "$NEON_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f /verify-data.sql' > "${dump_file}.verify.txt"
printf 'Dump: %s\nVerifikasi sumber: %s.verify.txt\n' "$dump_file" "$dump_file"
