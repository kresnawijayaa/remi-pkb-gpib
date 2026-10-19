#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
umask 077
mkdir -p backups
backup_file="backups/remi-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
temporary_file="${backup_file}.partial"
trap 'rm -f -- "$temporary_file"' EXIT
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U remi -d remi --format=custom --no-owner --no-acl > "$temporary_file"
test -s "$temporary_file"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore --list < "$temporary_file" > /dev/null
mv -- "$temporary_file" "$backup_file"
printf 'Backup tersimpan: %s\n' "$backup_file"
