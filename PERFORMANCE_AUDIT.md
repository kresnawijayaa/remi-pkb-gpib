# Performance Audit

Tanggal audit: 2026-07-01

## Ringkasan

Audit menemukan beberapa penyebab yang paling mungkin membuat development dan interaksi terasa lambat:

1. Turbopack sempat dicoba untuk mempercepat dev server, tetapi di environment lokal ini memicu error HMR `unrecognized HMR message`.
2. `package.json` memakai range versi yang tidak sama dengan versi aktual ter-install, sehingga dependency bisa berubah tanpa sengaja saat install ulang.
3. Middleware berjalan untuk terlalu banyak request, termasuk request file statis umum.
4. Beberapa server action melakukan query/update database secara serial untuk data yang independen.
5. Submit skor menghitung ranking lalu mencari rank dengan `find()` berulang.
6. Dashboard tab menghitung jumlah peserta komunitas dengan filter ulang di setiap render.

## File Diubah

- `package.json`
- `package-lock.json`
- `middleware.ts`
- `src/app/actions.ts`
- `src/app/api/tables/[tableId]/score/route.ts`
- `src/components/tournament/tournament-setup-tabs.tsx`

## Perubahan Yang Diterapkan

### 1. Dev Server Kembali Menggunakan Webpack Stabil

Script dev default menggunakan:

```bash
npm run dev
```

yang menjalankan:

```bash
next dev
```

Turbopack tetap tersedia sebagai opsi manual:

```bash
npm run dev:turbo
```

Keputusan ini diambil setelah `next dev --turbopack` memunculkan error berulang:

```txt
unrecognized HMR message {"event":"ping","page":"/_error"}
```

Dalam kondisi ini, Webpack default lebih penting untuk stabilitas Fast Refresh daripada startup Turbopack yang lebih cepat.

### 2. Versi Dependency Dipin Ke Versi Aktual

Dependency penting dipin ke versi yang sedang dipakai di workspace:

- `next` 15.5.19
- `react` 19.2.7
- `react-dom` 19.2.7
- `typescript` 5.9.3
- `@neondatabase/serverless` 1.1.0
- `zod` 3.25.76

Tujuannya agar install ulang tidak tiba-tiba mengambil versi berbeda yang bisa memicu masalah HMR, vendor chunk, atau mismatch runtime.

### 3. Middleware Lebih Terbatas

Matcher middleware diubah agar tidak memproses file statis umum:

```ts
matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
```

Middleware tetap melindungi route aplikasi dan API tanpa ikut berjalan untuk request asset seperti file CSS, JS, image, dan file berekstensi lain.

### 4. Query/Update Serial Dikurangi

Beberapa operasi database yang independen dijalankan paralel:

- Insert peserta meja saat generate babak.
- Update seed order peserta.
- Isi komunitas/peserta simulasi.
- Isi skor simulasi.
- Submit skor meja.

Untuk skor simulasi, query pemain sekarang diambil sekali per babak, bukan query ulang per meja.

### 5. Submit Skor Lebih Cepat

Submit skor di API route dan server action sekarang:

- Membuat `rankMap` sekali.
- Menghindari `find()` berulang.
- Update 5 pemain meja dengan `Promise.all`.

Ini mengurangi waktu tunggu saat klik `Kirim Hasil Meja`.

### 6. Log Durasi Proses

Log sederhana ditambahkan untuk proses yang bisa terasa lambat:

```txt
[PERF] generate round ...: 123ms
[PERF] reshuffle round ...: 123ms
[PERF] generate final ...: 123ms
[PERF] simulation scores ...: 123ms
[PERF] api submit score ...: 123ms
```

Di development log selalu muncul. Di production log hanya muncul jika durasi di atas 500ms.

### 7. Rendering Tab Komunitas Dirapikan

Jumlah peserta per komunitas dihitung sekali dengan `useMemo` dan `Map`, bukan `participants.filter()` untuk setiap komunitas.

## Hasil Verifikasi

Perintah yang sudah dijalankan:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm ls --depth=0
npm outdated
```

Hasil:

- Lint berhasil.
- Type-check berhasil.
- Production build berhasil.
- `npm ls --depth=0` tidak menunjukkan dependency rusak.
- `npm outdated` menunjukkan beberapa major upgrade tersedia, tetapi tidak dieksekusi karena berisiko mengubah stack besar.

## Cara Menjalankan Setelah Optimasi

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

Jika Fast Refresh masih menyimpan error lama setelah perubahan besar:

```bash
npm run dev
```

Jika masih stale, hentikan dev server, lalu hapus cache `.next` secara manual dan jalankan ulang `npm run dev`. Ini hanya perlu untuk kasus cache korup, bukan workflow normal.

## Cara Test Performa

1. Jalankan `npm run dev`.
2. Buka halaman utama.
3. Buka satu turnamen dengan 50 peserta.
4. Test tombol utama:
   - Buat babak.
   - Shuffle ulang draft.
   - Aktifkan babak.
   - Input skor meja.
   - Isi skor random dari Dev tools.
   - Generate final.
5. Perhatikan terminal untuk log `[PERF]`.
6. Bandingkan dengan mode production:

```bash
npm run build
npm run start
```

## Audit Client Component

Client component yang ditemukan:

- `SubmitButton`: memang butuh pending state.
- `ScoreModal`: memang butuh modal, form submit AJAX, dan router refresh.
- `DevTestingMenu`: memang butuh state modal/menu.
- `ViewerBoard`: memang butuh slideshow, fullscreen, dan state autoplay.
- `TournamentSetupTabs`: memang butuh tab state.

Tidak ditemukan file besar yang jelas-jelas harus dipaksa menjadi Server Component tanpa refactor UI besar.

## Audit Import Library Berat

`xlsx` hanya dipakai di `src/app/api/export/route.ts`, yaitu server route. Library ini tidak masuk client bundle halaman utama. Tidak perlu dynamic import client-side.

Tidak ditemukan import icon luas seperti:

```ts
import * as Icons from "lucide-react"
```

## Audit Asset/Image

Tidak ditemukan image besar yang diload pada halaman utama. Aksen kartu remi dibuat dengan HTML/CSS, bukan asset besar.

## Sisa Rekomendasi

Belum saya eksekusi karena perlu konfirmasi atau berisiko:

1. Upgrade major ke Next 16, Tailwind 4, ESLint 10, TypeScript 6, dan Zod 4.
2. Menambah pagination database untuk daftar turnamen/peserta jika nanti data sudah ratusan/ribuan.
3. Menambah index database tambahan bila log `[PERF]` menunjukkan query lambat di Neon production.
4. Menghapus `force-dynamic` di beberapa halaman hanya jika auth dan revalidation sudah dipastikan tidak butuh render dinamis penuh.
5. Mengubah batch insert/update menjadi SQL bulk `json_to_recordset` atau transaction jika data simulasi tumbuh jauh di atas 50 peserta.
