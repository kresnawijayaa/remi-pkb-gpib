# Deployment REMI ke VPS melalui GHCR

Target: Ubuntu x86_64, 1 CPU / RAM 2 GB, Docker Compose v2.26.1, Caddy pusat
`caddy_server` pada network eksternal `apps`. Tidak ada build di VPS.

## Susunan

- Image aplikasi: `ghcr.io/kresnawijayaa/remi-pkb-gpib:latest`.
- Image juga diberi tag `git-<commit>` agar versi yang sama bisa dijalankan kembali.
- Caddy pusat -> `remi-pkb-app:3000` melalui network `apps`.
- Aplikasi -> `postgres:5432` melalui network privat milik project ini.
- PostgreSQL 18 memiliki volume persisten tersendiri; tidak membuka port ke host.
- Port aplikasi `127.0.0.1:3085` hanya untuk pengecekan lokal/SSH tunnel.
- Batas RAM awal: app 512 MB, database 256 MB. Ini perlu diuji saat simulasi ramai;
  satu CPU tetap bisa menjadi batas ketika generator shuffle berjalan.
- File `.env` dan backup tidak masuk Git ataupun image.
- `DATABASE_DRIVER=postgres` memilih koneksi TCP dengan pool maksimal 5 koneksi.
  Nilai default `neon` tetap tersedia untuk development/rollback Vercel.

## 1. Laptop: build dan push

Docker Desktop harus aktif dalam mode Linux containers. Login ke GHCR dengan
akun/token Anda menggunakan `docker login ghcr.io`; token tidak dimasukkan ke skrip.

```powershell
git status --short
git add Dockerfile .dockerignore .gitattributes docker-compose.prod.yml deploy scripts docs src middleware.ts next.config.ts package.json package-lock.json .env.example .gitignore
git commit -m "Prepare REMI deployment on VPS with PostgreSQL"
git push
.\scripts\build-push.ps1 -Registry ghcr.io -Namespace kresnawijayaa -Tag latest
```

Periksa daftar file sebelum commit karena workspace dapat berisi perubahan lain.
Skrip menjalankan lint dan test, memastikan checkout bersih, kemudian build image
`linux/amd64` dan push ke GHCR. Environment production diisi saat container dijalankan;
build tidak memerlukan atau menyalin `.env.local`.

## 2. VPS: perbarui checkout dan environment

Folder lama adalah checkout Git; tidak perlu dihapus.

```bash
cd ~/apps/remi-pkb-gpib
git status --short
git pull --ff-only
docker network inspect apps
docker login ghcr.io
```

Jika checkout mempunyai perubahan lokal atau `git pull` gagal, periksa dulu; jangan
gunakan `git reset --hard`. Login GHCR cukup sekali jika image private.

Jika belum ada `.env`:

```bash
cd ~/apps/remi-pkb-gpib
(umask 077; cp -n deploy/vps.env.example .env)
openssl rand -hex 32
```

Salin hasil hex ke `POSTGRES_PASSWORD` dalam `.env` melalui editor (`nano .env`).
Gunakan PIN admin yang diinginkan. Untuk `REMI_SESSION_SECRET`, gunakan nilai lama
dari pengaturan Vercel agar sesi yang masih aktif tetap cocok, atau hasil baru
`openssl rand -hex 32` (pengguna harus login kembali). Jangan bagikan secret.

Password PostgreSQL harus 64 karakter hex agar aman digunakan di URL Compose.
Mengubah `.env` setelah volume PostgreSQL berisi data tidak otomatis mengganti
password database. Jangan mengganti password atau major version image sembarangan.

```bash
chmod 600 .env
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml pull
```

`config --quiet` memvalidasi konfigurasi tanpa mencetak nilai secret.

## 3. Ekspor Neon dan restore ke PostgreSQL kosong

Tentukan jeda migrasi: semua panitia berhenti mengubah turnamen di Vercel sejak
ekspor dimulai sampai domain berpindah. Link lama masih bisa dibaca; jangan ada
input skor atau edit peserta selama jeda. Tidak ada sinkronisasi dua arah.

Gunakan connection string Neon **direct / non-pooler** dari Connect dashboard.
Skrip meminta URL secara tersembunyi dan tidak menyimpannya di checkout.
PostgreSQL sumber harus versi <=18; `pg_dump` akan menolak versi lebih baru.

```bash
cd ~/apps/remi-pkb-gpib
bash scripts/export-neon.sh
```

Skrip mengekspor semua tabel schema `public` (termasuk arsip lama), lalu membuat
file verifikasi jumlah baris serta checksum JSON mentah v2. Token publik, ID, versi,
dan timestamps dipertahankan. Sumber Neon tidak diubah. File backup berisi data
peserta dan token publik; simpan privat dan salin satu cadangan ke luar VPS.

Gunakan **nama file yang dicetak skrip**, contohnya:

```bash
bash scripts/restore-neon.sh backups/neon-20261019T020000Z-12345.dump
```

Restore hanya berjalan jika aplikasi belum berjalan dan schema public tujuan belum
memiliki objek (tabel, fungsi, maupun tipe). Schema public kosong bawaan akan dibuat
ulang sesuai dump. Restore memakai satu transaksi; error tidak meninggalkan
hasil impor sebagian. Jangan menjalankan `npm run db:reset` karena itu menghapus
schema. Jangan menjalankan `deploy.sh` sebelum restore pertama karena deploy
membuat tabel v2 dan restore akan menolak tujuan yang tidak kosong.

Jika jumlah baris atau checksum berbeda, jangan pindahkan domain. Jangan menghapus
volume untuk mengulang tanpa memeriksa penyebab dan backup terlebih dahulu.

## 4. Jalankan dan periksa sebelum mengganti DNS

```bash
bash scripts/deploy.sh
curl -fsS http://127.0.0.1:3085/healthz
docker compose -f docker-compose.prod.yml ps
```

Hasil health harus `{"status":"ok"}`. Skrip deploy membuat backup otomatis,
menyiapkan tabel v2 bila belum ada, kemudian menjalankan image dan menunggu sehat.
Tidak ada build, pull Git otomatis, penghapusan volume, atau restart project lain.

Gunakan SSH tunnel dari laptop untuk memeriksa tampilan sebelum DNS berubah:

```powershell
ssh -L 3085:127.0.0.1:3085 kresna@103.127.136.60
```

Buka `http://localhost:3085/login`. Cookie login bersifat Secure di production,
jadi browser/versi browser tertentu dapat membatasi login HTTP; gunakan hostname
HTTPS sementara bila diperlukan. Sebelum cutover, utamakan pemeriksaan baca-saja
agar database tujuan tidak berbeda dari snapshot Neon. Periksa judul event,
peserta, skor/klasemen, arsip, public link asli, dan unduhan PDF.

## 5. Caddy pusat dan domain

Tambahkan blok dari `deploy/remi.Caddyfile` ke **file yang sudah ada**, tanpa
mengganti blok project lain:

```caddyfile
remi.gpibharapanindah.org {
    encode gzip zstd
    log {
        output file /data/remi-access.log
    }
    reverse_proxy remi-pkb-app:3000
}
```

Backup Caddyfile dahulu, edit, validasi, lalu reload:

```bash
cd ~/apps/caddy
cp -n Caddyfile "Caddyfile.before-remi-$(date -u +%Y%m%dT%H%M%SZ)"
nano Caddyfile
docker exec caddy_server caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec caddy_server caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Hanya reload jika validasi sukses. Arahkan DNS `remi.gpibharapanindah.org` ke IPv4
VPS `103.127.136.60`, mengganti record Vercel yang berbenturan. Periksa record AAAA
agar tidak tetap mengarah ke host lama. Caddy mengurus sertifikat HTTPS saat domain
sudah menunjuk VPS dan port 80/443 dapat diakses.

Setelah HTTPS siap, periksa login, tambah komunitas/peserta uji, input skor,
klasemen publik dan PDF. Gunakan turnamen uji terpisah untuk pengujian tulis.
Pastikan semua panitia menggunakan domain baru, bukan URL deployment Vercel.
Vercel dan Neon lama dipertahankan sementara sebagai sumber pemulihan.

## 6. Deployment berikutnya

Laptop: commit/push, kemudian build/push seperti biasa. VPS:

```bash
cd ~/apps/remi-pkb-gpib
git pull --ff-only
bash scripts/deploy.sh
```

Skrip membuat backup sebelum update dan mencoba rollback image jika health check
app gagal. Schema saat ini hanya aditif. Rollback image tidak membatalkan migrasi
database atau mengembalikan perubahan skor. Jangan menjalankan dua deployment
bersamaan.

Untuk menjalankan kembali versi image tertentu tanpa mengubah `.env`:

```bash
REMI_IMAGE=ghcr.io/kresnawijayaa/remi-pkb-gpib:git-COMMIT bash scripts/deploy.sh
```

## 7. Backup dan pemulihan

Backup manual (full database, custom dump):

```bash
cd ~/apps/remi-pkb-gpib
bash scripts/backup.sh
```

File disimpan di `backups/`, bukan dalam container. Salin ke laptop/media lain.
Backup saat deployment saja tidak cukup untuk pertandingan berjalan. Jadwalkan
backup berkala sesuai toleransi kehilangan hasil, misalnya setiap 15 menit melalui
crontab pengguna `kresna`:

```cron
*/15 * * * * cd /home/kresna/apps/remi-pkb-gpib && bash scripts/backup.sh >> /home/kresna/apps/remi-pkb-gpib/backups/cron.log 2>&1
```

Folder `backups` harus sudah ada. Tidak ada penghapusan backup otomatis; pantau
ruang disk. Jangan gunakan `docker compose down -v` atau volume prune pada data ini.
Untuk restore backup setelah sistem beroperasi, hentikan input dan rencanakan
restore ke database/volume baru; jangan menimpa database aktif.

Rollback DNS ke Vercel setelah VPS menerima input baru akan kehilangan perubahan
terbaru dari sudut pandang Neon. Ekspor/sinkronkan data terbaru dahulu sebelum
rollback; jangan menjalankan dua database sebagai sumber tulis bersamaan.

## Pemeriksaan gangguan

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=80 app
docker compose -f docker-compose.prod.yml logs --tail=80 postgres
docker stats --no-stream
curl -fsS http://127.0.0.1:3085/healthz
```

RAM/CPU pada VPS dipakai bersama project lain. Migrasi mengurangi perjalanan query
ke Neon/Vercel tetapi tidak otomatis memperbaiki refresh ganda atau biaya generator;
ukur kembali setelah cutover sebelum mengubah bagian tersebut.
