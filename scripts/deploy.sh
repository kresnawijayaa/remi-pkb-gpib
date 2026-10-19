#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose=(docker compose -f docker-compose.prod.yml)
exec 9> .deploy.lock
if ! flock -n 9; then
  printf 'Deployment REMI lain sedang berjalan.\n' >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  printf 'Buat .env dari deploy/vps.env.example dahulu.\n' >&2
  exit 1
fi
"${compose[@]}" config --quiet
docker network inspect apps > /dev/null

# Tarik image sebelum mengubah container yang sedang berjalan.
"${compose[@]}" pull
"${compose[@]}" up -d --wait --wait-timeout 120 postgres
bash scripts/backup.sh

previous_image="$(docker inspect remi-pkb-app --format '{{.Image}}' 2>/dev/null || true)"
if [[ -n "$previous_image" ]]; then
  umask 077
  printf '%s\n' "$previous_image" > .deploy-state
fi

# Hanya menambah schema v2 jika belum ada; tidak menjalankan db:reset.
"${compose[@]}" run --rm --no-deps app node scripts/migrate-postgres.mjs
if "${compose[@]}" up -d --no-deps --wait --wait-timeout 120 app; then
  printf '\nREMI siap. Cek: curl -fsS http://127.0.0.1:3085/healthz\n'
  printf 'Caddy pusat: reverse_proxy remi-pkb-app:3000\n'
else
  printf '\nDeployment gagal mencapai healthy. Periksa: docker compose -f docker-compose.prod.yml logs --tail=80 app\n' >&2
  if [[ -n "$previous_image" ]]; then
    printf 'Mengembalikan image aplikasi sebelumnya...\n' >&2
    REMI_IMAGE="$previous_image" "${compose[@]}" up -d --no-deps --pull never --wait --wait-timeout 120 app
  fi
  exit 1
fi
