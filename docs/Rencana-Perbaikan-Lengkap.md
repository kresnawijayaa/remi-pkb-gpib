# Rencana Perbaikan Lengkap Aplikasi Turnamen Remi PKB

Tanggal penyusunan: 16 September 2026  
Target deployment: Vercel dengan Neon PostgreSQL  
Status: rencana implementasi yang menunggu pengerjaan kode

## 1. Keputusan Panitia yang Menjadi Dasar

1. Kapasitas meja maksimal lima peserta.
2. Jumlah meja dihitung dengan `ceil(jumlah peserta / 5)` dan peserta dibagi merata. Selisih jumlah peserta antar-meja tidak boleh lebih dari satu. Contoh: 6 menjadi 3-3, 12 menjadi 4-4-4, dan 21 menjadi 5-4-4-4-4.
3. Poin meja adalah 5, 4, 3, 2, dan 1 untuk peringkat 1 sampai 5.
4. Urutan klasemen adalah total poin, jumlah peringkat 1, jumlah peringkat 2, jumlah peringkat 3, total skor, lalu keputusan panitia jika seluruh pembanding tetap seri.
5. Peserta yang mundur sebelum babak pertama boleh dibiarkan pada pembagian atau pembagian boleh dibuat ulang. Keputusan ada pada panitia.
6. Peserta yang walkout setelah mengikuti beberapa babak tetap memiliki hasil lama, tetapi tidak bermain pada babak berikutnya.
7. Walkout di tengah permainan menggunakan skor saat berhenti dan tetap diranking bersama peserta lain pada meja tersebut.
8. Pengganti meneruskan hasil peserta sebelumnya. Riwayat harus tetap menunjukkan identitas peserta awal dan waktu penggantian.
9. Peserta terlambat masih boleh masuk jika permainan belum dimulai. Setelah permainan dimulai, keikutsertaannya ditentukan panitia.
10. Hasil sebelum diskualifikasi tetap sah. Diskualifikasi tidak menaikkan ranking atau poin peserta lain secara retroaktif.
11. Seri sempurna pada batas kelolosan ditandai untuk keputusan manual panitia. Nomor peserta tidak boleh menjadi penentu otomatis.
12. Peserta lolos yang mengundurkan diri digantikan oleh peserta pada peringkat berikutnya.
13. Keputusan melanjutkan, mengulang, atau membatalkan permainan yang terganggu berada pada panitia. Sistem mencatat keputusan dan menyesuaikan data setelah keputusan dibuat.
14. Rate limit login tetap menggunakan mekanisme saat ini. Risiko lintas-instance Vercel diterima dan dicatat.
15. Data sistem lama tetap disimpan mentah di database, sedangkan route dan antarmuka lama boleh dipensiunkan.
16. Backup v2 tersedia dalam JSON dan Excel. Import atau restore dikerjakan pada tahap lanjutan.

## 2. Sasaran Akhir

Aplikasi dinyatakan siap dipakai pada acara besar setelah memenuhi seluruh syarat berikut:

- tidak memiliki kerentanan critical atau high yang dapat diperbaiki tanpa mengganti fungsi utama;
- kapasitas dan pembagian meja selalu sesuai aturan maksimal lima dan merata;
- status aktif, walkout, diskualifikasi, absen, terlambat, dan penggantian dapat dicatat tanpa menghapus hasil lama;
- pembuatan tahap lanjutan tidak dapat meninggalkan event yatim atau duplikat;
- generator batas maksimum selesai dalam target waktu yang disepakati dan tidak melewati batas waktu fungsi Vercel;
- tersedia backup JSON dan Excel untuk setiap turnamen;
- alur kritis dilindungi test otomatis;
- security header aktif dan developer tools mati di production;
- panitia memiliki prosedur operasi, insiden, pemulihan, dan rollback yang telah diuji.

## 3. Urutan Implementasi Lengkap

### Tahap 0 Baseline dan Pengamanan Pengerjaan

Tujuan: memastikan setiap perubahan dapat dibandingkan dan dibatalkan dengan aman.

Pekerjaan:

1. Catat hasil `npm audit`, `npm run lint`, dan `npm run build` sebelum perubahan.
2. Ambil backup database Neon dan ekspor mentah tiga event production sebelum migrasi.
3. Dokumentasikan environment Vercel Production, Preview, dan Development tanpa menyalin nilai secret.
4. Buat daftar smoke test alur saat ini: login, membuat event, peserta, komunitas, generate, lock, share, skor, klasemen, kelolosan, dan tahap lanjutan.
5. Tetapkan data uji kecil, sedang, dan batas maksimum agar hasil performa dapat dibandingkan.

Verifikasi:

- backup dapat dibaca kembali;
- commit awal bersih dan tercatat;
- lint dan build awal berhasil;
- data uji tidak memakai data peserta sungguhan.

Kriteria selesai: baseline teknis, backup, dan checklist regresi tersedia sebelum perubahan kode pertama.

### Tahap 1 Test Harness dan Aturan Inti

Tujuan: mengunci perilaku bisnis sebelum refactor dan migrasi.

Pekerjaan:

1. Tambahkan test runner TypeScript dan perintah `test`, `test:watch`, serta `test:coverage`.
2. Buat fixture event untuk 2, 3, 5, 6, 12, 21, 200, dan 500 peserta.
3. Uji pembagian ukuran meja: jumlah meja, kapasitas maksimal lima, tidak ada peserta ganda, dan selisih ukuran maksimal satu.
4. Uji poin 5-4-3-2-1, skor negatif, skor seri, urutan manual, serta penolakan urutan seri yang duplikat.
5. Uji urutan klasemen dan kasus seri sempurna pada batas kelolosan.
6. Uji optimistic locking dan penolakan perubahan pada versi event yang usang.

Dependensi: Tahap 0.

Kriteria selesai: aturan yang sudah disetujui panitia memiliki test yang gagal jika perilakunya berubah.

### Tahap 2 Kapasitas Maksimal Lima dan Pembagian Merata

Tujuan: menutup ketidaksesuaian aturan poin dengan kapasitas meja.

Pekerjaan:

1. Ubah validasi `capacity` dari rentang 2-10 menjadi 2-5 atau hilangkan pilihan kapasitas dan tetapkan nilai maksimal lima pada domain.
2. Ubah semua form pembuatan, pengaturan, dan tahap lanjutan agar tidak menerima nilai di atas lima.
3. Pertahankan rumus jumlah meja `ceil(n / 5)` dan pembagian ukuran dasar ditambah sisa secara merata.
4. Tambahkan validasi server bahwa setiap meja berisi maksimal lima peserta dan perbedaan ukuran tidak lebih dari satu.
5. Perbarui copy UI agar menjelaskan kapasitas maksimal, bukan target lima orang mutlak.
6. Jalankan backfill pengaturan event v2 yang memiliki kapasitas di atas lima, jika ditemukan. Migrasi harus berhenti dan meminta keputusan bila data aktif tidak dapat dikonversi aman.

Dependensi: Tahap 1.

Kriteria selesai: nilai 6-10 tidak dapat disimpan dan seluruh fixture pembagian lulus.

### Tahap 3 Dependency dan Pensiun Sistem Lama

Tujuan: menghilangkan sumber kerentanan utama tanpa menghapus data historis.

Pekerjaan:

1. Migrasikan export lama dari `xlsx` ke `ExcelJS` atau nonaktifkan endpoint export lama setelah route lama dipensiunkan.
2. Hapus import dan dependency `xlsx` dari package serta lockfile.
3. Perbarui `exceljs`, `sharp` transitif, Next.js, dan dependency lain ke versi aman yang kompatibel.
4. Jalankan `npm audit` ulang dan dokumentasikan vulnerability yang tidak dapat dihapus beserta alasan dan mitigasinya.
5. Hapus tautan menuju `tournaments-old`, lalu jadikan route lama tidak dapat diakses dari UI.
6. Setelah backup database diverifikasi, hapus kode route dan komponen lama secara terpisah dari penghapusan tabel database.
7. Jangan drop tabel lama pada rilis ini. Data mentah tetap tersedia di Neon sesuai keputusan panitia.

Dependensi: Tahap 0. Dapat berjalan paralel secara konseptual dengan Tahap 2, tetapi merge dilakukan setelah test harness tersedia.

Kriteria selesai: `xlsx` tidak ada di dependency tree, route lama tidak tampil, data lama tetap ada, lint/build/test lulus, dan tidak ada critical/high yang belum memiliki keputusan tertulis.

### Tahap 4 Security Header dan Konfigurasi Production

Tujuan: memperkuat deployment Vercel tanpa mengubah model login yang dipilih panitia.

Pekerjaan:

1. Tambahkan `Content-Security-Policy`, proteksi framing melalui `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy`.
2. Tambahkan `Permissions-Policy` minimal untuk menutup kamera, mikrofon, dan geolokasi yang tidak digunakan.
3. Uji CSP pada Preview terlebih dahulu agar script Next.js, stylesheet, gambar logo, dan request Neon server tidak rusak.
4. Pastikan `REMI_DEV_TOOLS_ENABLED=false` pada Vercel Production dan Preview yang dipakai panitia.
5. Pastikan `REMI_DEV_PIN` tidak diperlukan di production ketika developer tools mati.
6. Verifikasi panjang dan rotasi `REMI_SESSION_SECRET` serta `REMI_ADMIN_PIN` tanpa menampilkan nilainya.
7. Pertahankan rate limit login saat ini dan tulis sebagai accepted risk. Tambahkan monitoring log login gagal bila dapat dilakukan tanpa penyimpanan baru.
8. Jadikan lint dan test langkah wajib sebelum build deployment, meskipun konfigurasi Next saat ini mengizinkan build melewati lint.

Dependensi: Tahap 1.

Kriteria selesai: header terlihat pada response production-like, dev tools tidak muncul, login dan link publik tetap bekerja, serta accepted risk tercatat.

### Tahap 5 Model Status Peserta dan Riwayat Insiden

Tujuan: menangani kejadian pertandingan tanpa merusak hasil lama.

Pekerjaan:

1. Naikkan versi data event dan tambahkan status peserta: `active`, `late`, `absent`, `withdrawn`, dan `disqualified`.
2. Tambahkan catatan insiden dengan waktu, babak, jenis, alasan, keputusan panitia, dan identitas operator.
3. Tambahkan riwayat penggantian yang menghubungkan peserta awal dan pengganti serta babak efektif.
4. Jangan mengubah identitas pada hasil babak lama. Tampilan klasemen menjelaskan bahwa poin diteruskan kepada peserta pengganti.
5. Peserta withdrawn atau disqualified tidak dimasukkan pada generate babak berikutnya, tetapi seluruh skor lama tetap dihitung.
6. Untuk pembagian masa depan yang sudah terkunci, sediakan pilihan panitia: mempertahankan kursi kosong atau membuka kunci dan menyeimbangkan ulang.
7. Jika pembagian dibuka, tarik jadwal dari link publik, hapus draft setelahnya sesuai aturan locking, lalu minta panitia memublikasikan ulang.
8. Walkout di tengah permainan menyimpan skor saat berhenti dan menghitung ranking meja secara normal.
9. Peserta terlambat ditandai; panitia mencatat apakah diizinkan masuk setelah permainan dimulai.
10. Diskualifikasi berlaku sejak waktu keputusan dan tidak menghitung ulang hasil lama.

Dependensi: Tahap 1 dan Tahap 2. Membutuhkan migration/backfill data v2.

Kriteria selesai: seluruh skenario status memiliki audit trail, hasil lama tidak berubah, dan generator hanya memakai peserta yang berhak bermain.

### Tahap 6 Kelolosan Manual dan Penggantian Finalis

Tujuan: mencegah sistem memutuskan seri kritis atau pengunduran diri tanpa panitia.

Pekerjaan:

1. Deteksi seri sempurna pada batas jumlah peserta lolos setelah seluruh pembanding resmi digunakan.
2. Hilangkan nomor peserta sebagai penentu otomatis untuk seri kritis.
3. Tampilkan daftar peserta seri dan wajibkan panitia memilih peserta yang lolos beserta catatan keputusan.
4. Simpan keputusan manual dalam audit event.
5. Tambahkan aksi mengganti peserta lolos yang mengundurkan diri dengan peringkat berikutnya.
6. Cegah pembuatan tahap lanjutan sampai seri kritis dan penggantian peserta selesai.
7. Uji bahwa keputusan tidak mengubah urutan hasil peserta lain.

Dependensi: Tahap 5 dan test klasemen Tahap 1.

Kriteria selesai: tidak ada keputusan seri kritis yang dibuat diam-diam oleh fallback teknis.

### Tahap 7 Transaksi Atomik Tahap Lanjutan

Tujuan: mencegah child event yatim atau duplikat.

Pekerjaan:

1. Pindahkan pembuatan child event dan pembaruan audit parent ke satu transaksi database.
2. Tambahkan idempotency key atau relasi unik parent dan tahap agar klik ulang tidak membuat duplikat.
3. Simpan relasi parent-child secara eksplisit dan tampilkan tautan dua arah.
4. Uji kegagalan di antara insert child dan update parent.
5. Uji dua perangkat membuat tahap secara bersamaan.
6. Sediakan skrip audit untuk mencari dan melaporkan child yatim sebelum migration diterapkan.

Dependensi: Tahap 1. Sebaiknya selesai sebelum fitur penggantian finalis dipakai production.

Kriteria selesai: operasi berhasil seluruhnya atau gagal tanpa perubahan apa pun.

### Tahap 8 Optimasi Generator

Tujuan: menjaga waktu generate di bawah batas operasional Vercel.

Pekerjaan:

1. Profilkan generator dengan fixture 200 dan 500 peserta pada babak awal, tengah, dan ke-20.
2. Hitung `meetingMap` sekali untuk setiap proses generate, bukan pada setiap evaluasi pertukaran.
3. Hitung perubahan penalty secara lokal untuk dua meja yang ditukar, bukan menilai seluruh susunan kembali.
4. Kurangi pencarian linear peserta dengan map ID ke peserta dan map ID ke komunitas.
5. Terapkan budget waktu dan jumlah iterasi yang deterministik. Bila solusi sempurna tidak ditemukan, kembalikan hasil terbaik dengan peringatan review.
6. Catat durasi, jumlah iterasi, penalty akhir, pertemuan ulang, dan pasangan satu komunitas untuk diagnosis.
7. Pastikan optimasi tidak mengurangi validitas pembagian atau membuat hasil tidak dapat direproduksi pada seeded test.

Dependensi: Tahap 1 dan Tahap 2.

Target penerimaan awal:

- 200 peserta dan 5 babak tetap nyaman untuk interaksi panitia;
- 500 peserta dan babak ke-20 turun jauh dari baseline sekitar 27 detik dan aman terhadap timeout Vercel;
- batas final ditetapkan berdasarkan hasil benchmark di Preview, bukan asumsi lokal.

Kriteria selesai: benchmark, batas waktu, dan kualitas pembagian tercatat serta lulus di environment menyerupai production.

### Tahap 9 Backup JSON dan Excel V2

Tujuan: memberi jalan pemulihan operasional sebelum acara besar.

Pekerjaan:

1. Tambahkan export JSON lengkap yang memuat versi format, identitas event, settings, komunitas, peserta, status, riwayat penggantian, draw, hasil, kelolosan, audit, dan checksum.
2. Tambahkan export Excel yang mudah dibaca dengan sheet Ringkasan, Peserta, Pembagian, Skor, Klasemen, Insiden, dan Audit.
3. Nama file memuat nama event dan waktu export yang aman untuk filesystem.
4. Hanya pengguna terautentikasi yang dapat mengekspor data lengkap.
5. Tambahkan tombol backup pada halaman event dan prosedur backup sebelum serta selama acara.
6. Verifikasi file pada event kosong, event berjalan, event selesai, skor negatif, seri, walkout, penggantian, dan diskualifikasi.
7. Import/restore JSON tidak masuk rilis pertama. Rancang schema validation dan mode dry-run untuk tahap lanjutan.

Dependensi: Tahap 5 agar format backup sudah memuat status insiden.

Kriteria selesai: kedua file dapat dibuka, isinya konsisten dengan database, dan JSON memiliki versi serta checksum.

### Tahap 10 Query Ringkasan dan Migrasi Data

Tujuan: mencegah daftar event melambat dan menyamakan data mentah dengan hasil yang dilihat UI.

Pekerjaan:

1. Ubah `listEvents` agar mengambil kolom ringkasan, bukan seluruh JSON maksimal 100 event.
2. Pilih implementasi ringkasan: kolom materialized yang diperbarui saat save atau ekspresi JSONB dengan index yang sesuai.
3. Tambahkan pagination atau load-more dan total count yang efisien.
4. Buat migration backfill poin lama ke 5-4-3-2-1 sehingga database mentah tidak bergantung pada `upgradeEventData` saat dibaca.
5. Jalankan migration secara idempotent dan simpan jumlah record sebelum, diubah, dilewati, dan gagal.
6. Pertahankan `upgradeEventData` selama satu masa kompatibilitas, lalu evaluasi penghapusannya setelah seluruh data tervalidasi.

Dependensi: backup Tahap 0 dan aturan test Tahap 1.

Kriteria selesai: daftar event tidak mengambil payload penuh, migration dapat dijalankan ulang, dan hasil klasemen sebelum-sesudah identik.

### Tahap 11 Perbaikan UX dan Aksesibilitas

Tujuan: mengurangi kesalahan operator pada ponsel dan membuat status lebih jelas.

Pekerjaan:

1. Buat kolom peserta sticky pada klasemen mobile dan uji horizontal scroll.
2. Ganti header medali yang hanya emoji dengan label aksesibel dan teks bantu yang tetap ringkas.
3. Naikkan seluruh teks operasional minimum ke ukuran yang layak dibaca pada ponsel; hindari teks sekunder 8-10 px.
4. Pada event arsip, tampilkan mode baca-saja yang jelas dan sembunyikan form edit, bukan hanya menonaktifkan fieldset.
5. Tambahkan status visual untuk late, absent, withdrawn, disqualified, dan replacement tanpa bergantung pada warna saja.
6. Tambahkan konfirmasi yang menyebut dampak ketika membuka lock, regenerate, mengubah finalis, atau mengoreksi skor.
7. Uji keyboard, screen reader labels, reduced motion, target sentuh, text zoom, dan viewport kecil.

Dependensi: Tahap 5 dan Tahap 6.

Kriteria selesai: audit aksesibilitas dan pengujian perangkat utama tidak menemukan blocker operasional.

### Tahap 12 Test Suite Lengkap

Tujuan: melindungi seluruh alur sebelum rollout.

Kelompok test wajib:

1. Unit: scoring, tie-break, table sizing, penalty, upgrade data, import parser, checksum backup.
2. Property/invariant: setiap peserta aktif muncul tepat sekali, kapasitas maksimal lima, selisih ukuran maksimal satu, dan tidak ada ID asing.
3. Integration: optimistic locking, transaction tahap lanjutan, qualification manual, replacement, status insiden, export JSON/Excel.
4. Security: route tanpa sesi, token share salah, token dicabut, header response, developer tools production.
5. End-to-end: persiapan event sampai tahap lanjutan, termasuk koreksi skor dan satu skenario walkout.
6. Performance: benchmark generator dan query daftar event.
7. Migration: backfill pada salinan data production yang sudah dianonimkan.

Dependensi: seluruh tahap fungsional terkait.

Kriteria selesai: test kritis wajib lulus pada CI dan kegagalan mencegah deployment production.

### Tahap 13 Dokumentasi Operasional dan Teknis

Tujuan: membuat panitia mampu menjalankan acara dan memahami konsekuensi keputusan.

Pekerjaan:

1. Perbarui README dengan setup lokal, environment, migration, deployment Vercel, backup, restore, dan prosedur darurat.
2. Finalisasi PDF Panduan Operasional berdasarkan UI yang sudah selesai dan tambahkan tangkapan layar bila diperlukan.
3. Finalisasi PDF Penjelasan Sistem dan flowchart berdasarkan implementasi akhir.
4. Buat lembar satu halaman untuk checklist meja operator dan kontak eskalasi panitia.
5. Lakukan simulasi bersama panitia menggunakan data uji, bukan data production.
6. Catat pertanyaan yang muncul pada simulasi dan revisi dokumentasi.

Dependensi: UI dan perilaku target telah selesai.

Kriteria selesai: panitia lain dapat menyelesaikan simulasi tanpa bantuan developer untuk alur normal.

### Tahap 14 Preview, Gladi Bersih, dan Deployment Production

Tujuan: merilis perubahan dengan jalur pemulihan yang jelas.

Urutan:

1. Deploy ke Vercel Preview dengan salinan database uji.
2. Jalankan migration dry-run dan verifikasi laporan.
3. Jalankan seluruh automated test, lint, build, audit dependency, security header check, dan benchmark.
4. Lakukan gladi bersih minimal dua perangkat admin, satu ponsel peserta, koneksi lambat, koreksi skor, walkout, tie cutoff, backup, dan tahap lanjutan.
5. Bekukan perubahan data singkat sebelum migration production.
6. Ambil snapshot Neon dan backup JSON event aktif.
7. Jalankan migration production satu per satu dan verifikasi jumlah record.
8. Deploy Vercel Production dengan dev tools mati.
9. Jalankan smoke test tanpa mengubah event sungguhan atau gunakan event uji khusus.
10. Pantau error, latency, generator, login gagal, dan konflik version selama acara pertama.

Rollback:

- rollback Vercel ke deployment sebelumnya jika UI atau API gagal;
- hentikan write jika migration data menghasilkan ketidaksesuaian;
- pulihkan Neon dari snapshot hanya bila koreksi maju tidak aman;
- jangan menghapus backup sebelum event selesai dan hasil disahkan.

Kriteria selesai: smoke test production lulus dan panitia memiliki backup serta prosedur fallback manual.

### Tahap 15 Restore Import dan Hardening Lanjutan

Tujuan: menutup fitur pemulihan penuh setelah rilis utama stabil.

Pekerjaan:

1. Implementasikan import JSON hanya untuk format yang memiliki version dan checksum valid.
2. Gunakan dry-run yang menampilkan event baru, konflik ID, data tidak valid, dan perubahan yang akan terjadi.
3. Restore membuat event baru secara default agar tidak menimpa production tanpa sengaja.
4. Overwrite hanya tersedia dengan konfirmasi berlapis, backup otomatis, dan optimistic lock.
5. Pertimbangkan kembali rate limit durable apabila aplikasi mulai dipakai banyak organisasi atau serangan login muncul pada log.
6. Evaluasi penghapusan tabel lama setelah periode retensi dan keputusan tertulis panitia.

Dependensi: format backup Tahap 9 stabil.

Kriteria selesai: restore teruji pada database kosong dan database berisi konflik tanpa merusak event yang sudah ada.

## 4. Urutan Rilis yang Disarankan

### Rilis 1 Pengaman Production

Mencakup Tahap 0-4, transaksi atomik pada Tahap 7, test kritis awal, serta export backup minimal. Rilis ini menutup dependency, kapasitas meja, header keamanan, dev tools production, dan risiko child event yatim.

### Rilis 2 Ketahanan Operasional Pertandingan

Mencakup Tahap 5-6, optimasi generator, backup lengkap, query ringkasan, migration poin, UX, dan test suite lengkap.

### Rilis 3 Pemulihan dan Penyempurnaan

Mencakup import/restore, evaluasi rate limit durable, dan keputusan retensi database lama.

## 5. Daftar Kemungkinan Saat Pertandingan

| Kejadian | Respons sistem target | Keputusan panitia |
|---|---|---|
| Peserta tidak datang sebelum babak 1 | Tandai absent atau hapus sebelum lock; tawarkan regenerate | Lanjut dengan kursi kosong atau generate ulang |
| Peserta terlambat sebelum permainan dimulai | Tandai late lalu aktifkan saat hadir | Izinkan masuk |
| Peserta terlambat setelah permainan dimulai | Catat late dan keputusan | Izinkan atau absen pada babak itu |
| Walkout sebelum babak | Tandai withdrawn; keluarkan dari generate berikutnya | Pertahankan atau susun ulang pembagian terkunci |
| Walkout di tengah permainan | Simpan skor saat berhenti dan ranking normal | Sahkan skor dan alasan |
| Peserta pengganti | Hubungkan pengganti dengan peserta awal dan teruskan hasil | Sahkan identitas serta babak efektif |
| Diskualifikasi | Pertahankan hasil lama; keluarkan dari babak berikutnya | Catat alasan dan waktu berlaku |
| Peserta bermain di meja salah | Tahan input atau koreksi draw sebelum skor disahkan | Putuskan hasil diterima, dipindah, atau permainan diulang |
| Skor seri | Wajibkan urutan manual peserta yang seri | Menentukan urutan berdasarkan aturan pertandingan |
| Salah input skor | Buka koreksi selama kelolosan belum dikunci | Verifikasi bukti catatan meja |
| Koreksi setelah kelolosan dikunci | Buka kelolosan, koreksi, hitung ulang, lalu kunci ulang | Menyetujui dampak pada finalis |
| Seri sempurna di batas lolos | Tandai unresolved dan cegah tahap lanjutan | Memilih peserta atau mengadakan tiebreak |
| Finalis mengundurkan diri | Usulkan peringkat berikutnya | Sahkan pengganti finalis |
| Meja terlambat selesai | Tampilkan hasil belum lengkap | Menunda lock kelolosan atau menetapkan tindakan meja |
| Permainan dihentikan | Catat insiden; skor dapat disimpan, dibersihkan, atau diulang | Memilih lanjut, ulang, atau batal |
| Pembagian salah setelah dipublikasikan | Buka lock, tarik dari link publik, koreksi, publikasi ulang | Mengumumkan perubahan |
| Dua operator menyimpan bersamaan | Optimistic lock menolak perubahan kedua | Operator memuat ulang dan memeriksa perubahan |
| Sesi login berakhir | Tolak penyimpanan dan minta login ulang | Operator memastikan data belum tersimpan sebelum mengulang |
| Internet perangkat putus | Pertahankan input pada form jika memungkinkan; jangan mengklaim tersimpan | Gunakan catatan kertas dan input setelah koneksi kembali |
| Neon atau Vercel tidak tersedia | Gunakan backup dan catatan manual; hentikan write | Aktifkan prosedur darurat manual |
| Ponsel operator rusak atau hilang | Login dari perangkat cadangan; tidak ada data lokal sebagai sumber utama | Ganti perangkat dan amankan PIN bila perlu |
| Link publik lama terbuka | Tampilkan hanya draw terkunci terbaru setelah refresh | Minta peserta memuat ulang dan umumkan perubahan |
| Token publik tersebar | Cabut dan buat token baru | Sebarkan link pengganti |
| File import peserta rusak | Tolak sebelum commit dan tampilkan baris bermasalah | Perbaiki sumber data |
| Nama peserta ganda | Tampilkan peringatan dan nomor peserta sebagai pembeda | Sahkan apakah dua orang berbeda |
| Komunitas ganda ejaan | Tawarkan merge tanpa mengubah identitas peserta | Sahkan komunitas tujuan |
| Generator tidak menemukan susunan sempurna | Tampilkan hasil terbaik dan konflik | Terima atau tukar peserta manual |
| Generator melewati budget waktu | Hentikan aman dan kembalikan hasil terbaik/permintaan ulang | Coba ulang atau susun manual |
| Backup gagal dibuat | Jangan menganggap backup tersedia; tampilkan gagal | Tunda perubahan berisiko sampai backup berhasil |

## 6. Risiko yang Diterima dan Ditunda

1. Rate limit login berbasis memory tetap dipakai. Pada Vercel, pembatasan dapat berbeda antar-instance dan tidak dapat dianggap perlindungan serangan terdistribusi.
2. Import/restore backup ditunda sampai format export stabil.
3. Data lama tetap berada di database tanpa UI. Akses darurat memerlukan operator teknis sampai ada keputusan migrasi atau penghapusan.
4. Panduan PDF awal menggambarkan target. Dokumen harus diperbarui setelah implementasi dan gladi bersih.

## 7. Definisi Selesai Keseluruhan

Pekerjaan dianggap selesai hanya bila:

- keputusan bisnis di atas terimplementasi dan diuji;
- lint, build, unit, integration, end-to-end, migration, dan performance test lulus;
- audit dependency serta header keamanan diverifikasi pada Vercel;
- backup JSON dan Excel berhasil dibuka dan dibandingkan dengan sumber;
- migration production memiliki laporan dan rollback;
- dua PDF telah disesuaikan dengan UI final;
- panitia menyelesaikan gladi bersih termasuk satu insiden walkout, satu koreksi skor, dan satu seri kelolosan.
