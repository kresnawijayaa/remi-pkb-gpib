#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose=(docker compose -f docker-compose.prod.yml)
if [[ $# -ne 1 || ! -s "$1" || ! -s "$1.verify.txt" ]]; then
  printf 'Pemakaian: bash scripts/restore-neon.sh backups/neon-TANGGAL.dump\nDump dan file .verify.txt wajib tersedia.\n' >&2
  exit 1
fi
dump_file="$1"
if [[ -n "$("${compose[@]}" ps --status running --quiet app)" ]]; then
  printf 'Hentikan aplikasi REMI dahulu: docker compose -f docker-compose.prod.yml stop app\n' >&2
  exit 1
fi
"${compose[@]}" up -d --wait --wait-timeout 120 postgres
object_count="$("${compose[@]}" exec -T postgres psql -U remi -d remi -X -qAt -v ON_ERROR_STOP=1 \
  -c "select (select count(*) from pg_class where relnamespace = 'public'::regnamespace) + (select count(*) from pg_proc where pronamespace = 'public'::regnamespace) + (select count(*) from pg_type where typnamespace = 'public'::regnamespace);")"
if [[ "$object_count" != "0" ]]; then
  printf 'Restore dibatalkan: schema public tujuan sudah berisi objek. Tidak ada data yang dihapus.\n' >&2
  exit 1
fi

"${compose[@]}" exec -T postgres pg_restore -U remi -d remi \
  --clean --if-exists --no-owner --no-acl --exit-on-error --single-transaction < "$dump_file"
umask 077
"${compose[@]}" exec -T postgres psql -U remi -d remi -X -qAt -v ON_ERROR_STOP=1 \
  < deploy/verify-data.sql > "${dump_file}.target.verify.txt"
if ! diff -u -- "$dump_file.verify.txt" "$dump_file.target.verify.txt"; then
  printf 'Verifikasi berbeda. Jangan pindahkan domain; periksa data sumber/tujuan.\n' >&2
  exit 1
fi
printf 'Restore selesai. Jumlah baris semua tabel dan checksum data mentah v2 cocok.\n'
