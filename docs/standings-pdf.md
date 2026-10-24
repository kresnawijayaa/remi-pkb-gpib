# PDF klasemen

Tombol unduh tersedia pada panel **Bagikan klasemen** di halaman utama turnamen, klasemen admin, dan klasemen publik. Tidak ditampilkan pada daftar `/tournaments`. PDF mengekspor seluruh klasemen tersimpan, bukan hasil filter pencarian di browser. Belum ada hasil tetap menghasilkan satu halaman berisi keterangan kosong.

## Kontrak unduhan

- `GET /tournaments/{tournamentId}/standings/pdf`: memerlukan sesi panitia. Tidak memerlukan aktivasi link publik. Tanpa sesi, handler mengembalikan 401 teks; middleware dapat mengarahkan ke login. Turnamen tidak ada: 404.
- `GET /klasemen/{token}/pdf`: memakai validasi token/hash yang sama dengan halaman publik. Token invalid, diganti, dicabut, atau turnamen dihapus: 404. Tidak membuka akses admin.
- Berhasil: `application/pdf`, attachment `klasemen-{nama-turnamen}.pdf`, `Cache-Control: private, no-store, max-age=0`, `X-Content-Type-Options: nosniff`.
- Gagal membuat PDF: 500 teks tanpa header attachment. Error tidak disamarkan sebagai file PDF.
- PDF adalah snapshot saat diunduh, dengan waktu WIB dan status sementara/akhir. Hasil tersimpan yang belum disahkan tetap mengikuti perhitungan klasemen web. Tidak mengubah skor, peringkat, atau penguncian.
- Footer memuat hyperlink gereja dan shortlink `/k/{kode}` bila tersedia, fallback link token. Jika publik belum diaktifkan, footer memakai link aturan, bukan URL admin. Domain tetap `remi.gpibharapanindah.org`, bukan host internal Docker.

## Pemeriksaan lokal

- `npm test`: 39 tes lulus, termasuk proyeksi klasemen, pagination 200 peserta, PDF kosong, header unduhan, dan proteksi middleware.
- `npm run lint` dan `npm run build`: lulus.
- PDF dummy 200 peserta diperiksa dengan ekstraksi teks: seluruh 200 nama ada. Halaman pertama/terakhir dirender dan diperiksa, termasuk nama/komunitas panjang serta skor negatif.
- Postman terhadap build lokal `127.0.0.1:3118`: token invalid menghasilkan 404/no-store (2 assertion lulus); endpoint admin tanpa sesi menghasilkan 401/teks tanpa attachment (2 assertion lulus). CLI mengembalikan exit 1 untuk kedua respons non-2xx yang memang diharapkan.
- Tidak dilakukan unduhan dari data production atau pengujian token valid terhadap database production. Tidak ada mutasi database.
