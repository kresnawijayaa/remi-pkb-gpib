# Halaman aturan pertandingan

`/aturan` adalah acuan publik untuk panitia dan peserta; tidak membutuhkan sesi admin dan tidak membaca data turnamen.

Isi aturan berasal dari `src/lib/flexible/competition-rules.ts`. Halaman HTML dan generator PDF memakai sumber teks yang sama. Contoh perhitungan dan poin diuji terhadap mesin scoring.

## Kontrak unduhan

- `GET /aturan/pdf`: tanpa autentikasi, tanpa parameter, tidak mengubah data.
- Sukses: HTTP 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="aturan-pertandingan-remi-v1.pdf"`, `X-Content-Type-Options: nosniff`.
- Gagal: HTTP 500, teks penjelasan umum, `Cache-Control: no-store`; detail hanya dicatat di server.
- PDF berisi empat halaman, identitas gereja, nomor halaman, hyperlink gereja, dan URL kanonis `https://remi.gpibharapanindah.org/aturan`.
- Pengecualian autentikasi middleware hanya untuk `/aturan` dan `/aturan/pdf`, bukan seluruh subpath `/aturan/*`.

## Batas aturan dan implementasi

Seri penuh pada batas kelolosan diputuskan panitia dengan cara yang diumumkan saat acara. Urutan baris tidak merupakan kriteria pembeda resmi. Halaman ini tidak menambahkan pemecah seri atau form penentuan kelolosan manual; kode penguncian kelolosan yang ada tetap memilih urutan klasemen saat dikunci. Panitia perlu menyelesaikan kasus seri penuh dan memastikan daftar lolos sesuai keputusan sebelum mengunci. Jika ingin mencatat pilihan kelolosan hasil keputusan tersebut di aplikasi, dibutuhkan perubahan fitur tersendiri.

Aturan lapangan seperti kombinasi kartu, penalti, walkout, diskualifikasi, dan batas keberatan tidak ditentukan otomatis oleh halaman ini. Ketepatan data input tetap harus diperiksa panitia.

## Verifikasi

`npm test` mencakup aturan poin, contoh 19 poin/3.550 skor, isi kebijakan seri, jumlah halaman PDF, dan hyperlink. Pemeriksaan HTTP lokal menguji PDF asli tanpa login, nama file, tipe konten, halaman HTML, dan perlindungan halaman admin. PDF dirender dan diperiksa visual sebelum handoff.
