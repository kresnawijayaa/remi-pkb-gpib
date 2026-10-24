# Persiapan meeting operator REMI

Paket latihan untuk meeting 30–60 menit, dengan 2–5 operator. Semua peserta dan skor di paket ini adalah data fiktif. Tidak ada PIN, sesi login, atau data peserta asli di dalamnya.

## Bahan utama

Buka `Panduan-Meeting.html` di Chrome/Edge. Halaman ini bisa digunakan sebagai bahan penjelasan dan catatan demo, tanpa internet. Link menuju aplikasi tetap membutuhkan internet. Gunakan Ctrl+P jika ingin mencetak panduannya.

Gunakan `Catatan-Keputusan-Meeting.md` untuk mencatat kesepakatan dan PIC. Cetak `Lembar-Hasil-Meja.html` untuk latihan crosscheck atau pencatatan manual ketika koneksi terganggu.

Format acara yang dijelaskan: peserta awal mengikuti pendaftaran (perkiraan 200), maksimal 5 orang per meja, 5 babak penyisihan, 20 orang lolos. Jumlah babak dan kuota kelolosan tahap sesudahnya perlu dipastikan panitia; jangan menganggapnya otomatis 20 ke 10 ke 5.

## Isi folder data

| File | Kegunaan | Hasil yang diharapkan |
| --- | --- | --- |
| `01-peserta-demo-20.xlsx` | Latihan alur kecil: 20 peserta, 4 komunitas | Preview 20 peserta, 4 komunitas baru pada turnamen kosong; 4 meja berisi 5 |
| `02-peserta-skala-200.xlsx` | Demo impor sesuai perkiraan skala acara: 200 peserta, 10 komunitas | Preview 200 peserta, 10 komunitas baru pada turnamen kosong; 40 meja berisi 5 |
| `03-peserta-meja-merata-12.xlsx` | Opsional: jelaskan pembagian merata | 12 peserta, 3 komunitas; 3 meja berisi 4 |
| `04-acuan-skor-bukan-untuk-impor.xlsx` | Acuan mengetik skor dan menghitung ulang satu peserta | 3 babak × 4 meja; 60 isian skor, bukan upload skor |

Tersedia CSV UTF-8 pendamping untuk seluruh file peserta. Gunakan jika Excel tersimpan ulang oleh aplikasi lain dan gagal dibaca. File yang disertakan sudah diuji dengan parser impor lokal REMI; ini tidak menggantikan gladi singkat di deployment yang akan dipakai.

Folder `latihan-error` berisi file yang SENGAJA gagal: duplikat pasangan nama–komunitas dan header salah. Gunakan tombol **Periksa file** saja. Jangan menganggap file ini data peserta yang harus berhasil diimpor.

Nama peserta latihan pada file 12, 20, dan 200 sebagian sama. Gunakan turnamen BERBEDA untuk setiap file, bukan menggabungkan semuanya dalam satu turnamen.

## Siapkan sehari/sebelum meeting

1. Baca `Panduan-Meeting.html` sekali. Pilih versi 30, 45, atau 60 menit.
2. Siapkan laptop presenter, proyektor, minimal satu HP, koneksi utama, hotspot cadangan, dan charger.
3. Buka tiga tab: admin REMI, link pembagian publik, link klasemen publik. Dua link terakhir baru tersedia setelah dibuat; siapkan slot tabnya dahulu. Gunakan incognito/HP untuk membuktikan publik tidak perlu login.
4. Buat turnamen latihan bernama jelas, misalnya **LATIHAN MEETING 200**, pengaturan 200 peserta / 5 per meja / 5 babak / lolos 20. Untuk demo live, boleh biarkan kosong agar impor ditunjukkan dari awal.
5. Buat turnamen terpisah **LATIHAN OPERATOR 20**, pengaturan 20 peserta / 5 per meja / 3 babak / lolos 5. Impor file 01 bila ingin menghemat waktu. Jangan gunakan Staging atau turnamen acara asli.
6. Latih sendiri sekali: impor 20, shuffle, kunci pembagian, input satu meja, cek skor seri, simpan, lalu koreksi sebelum hasil dikunci.
7. Siapkan ujung alur pada salinan latihan terpisah bila ingin langsung menunjukkan kelolosan. Pilihan cepat: fitur developer mengisi skor simulasi per babak setelah pembagiannya dikunci, lalu Anda tetap harus mengunci hasil tiap babak. Mode ini MENIMPA seluruh skor babak terpilih, bukan hanya melengkapi yang kosong. Jangan lakukan pada data resmi atau babak latihan yang hasil manualnya ingin dipertahankan.
8. Catat URL turnamen latihan yang disiapkan. Tidak ada turnamen latihan yang dibuat otomatis oleh paket ini.
9. Pastikan ada backup database sebelum event. Backup bukan fitur PDF pembagian. PDF tidak dapat digunakan untuk restore seluruh skor.

## Cara memakai acuan skor

- Buka sheet **Skor per meja** pada file 04.
- Cocokkan Babak dan Meja. **Urutan tampil** berarti peserta pertama sampai kelima dari atas pada formulir web saat itu; bukan nomor peserta dan bukan peringkat.
- Isi skor sesuai urutan tersebut. Peringkat yang tercantum adalah jawaban latihan. Isi manual hanya untuk skor sama; yang lain otomatis.
- Contoh babak 1 meja 1: skor 900, 700, 500, 500, 300. Dua skor 500 diberi peringkat 3 dan 4 sesuai skenario latihan. Di acara sebenarnya, keputusan harus berasal dari ketentuan/juri, bukan urutan tampilan.
- Babak 1 meja 3 memuat skor 0. Nol adalah skor sah, berbeda dari kolom belum diisi.
- Untuk crosscheck, pilih satu peserta di klasemen publik, buka riwayatnya, lalu salin skor/peringkat 3 babak ke sel kuning sheet **Cek satu peserta**. Total akan tetap bertuliskan “Belum lengkap” sampai seluruh isian terkait lengkap.
- Pada demo 20 peserta, setiap meja lengkap berjumlah 15 poin; setiap babak lengkap berjumlah 60 poin; tiga babak berjumlah 180 poin. Total individu bergantung hasil shuffle dan peserta yang mendapat skor di setiap meja; tidak ada satu nama pemenang tetap di paket ini.
- Skor meja latihan tidak mengikuti aturan jumlah total kartu tertentu; ini angka fiktif untuk latihan pencatatan. Ketentuan permainan lapangan tetap ditetapkan panitia.

## Pembagian tugas yang disepakati

| Tugas | Nama utama | Cadangan |
| --- | --- | --- |
| Koordinator: berwenang mengesahkan hasil, koreksi, kelolosan | … | … |
| Operator: input skor dan pembagian | … | … |
| Pemeriksa: mencocokkan kertas hasil dengan web | … | … |
| Petugas layar/publik: proyektor, link, PDF, pengumuman revisi | … | … |
| Dukungan teknis: koneksi, sesi, backup, eskalasi | … | … |

Dengan 2 orang: orang A input, orang B memeriksa dan koordinasi. Dengan 3 orang: pisahkan pengesahan/layar. Dengan 4–5 orang: bagi input menurut rentang meja dan tambah petugas teknis/layar. Ini usulan pembagian tugas, bukan role permission terpisah di aplikasi.

Jika dua operator menyimpan pada turnamen yang sama, optimistic locking dapat menolak penyimpanan kedua. Jangan klik berkali-kali. Tunggu konfirmasi operator pertama, muat ulang, cocokkan apa yang sudah tersimpan, lalu input ulang hanya yang belum masuk. Uji pola kerja bergantian ini sebelum acara; pembagian rentang meja tidak menghilangkan konflik versi data turnamen.

## Checklist selesai meeting

- [ ] Setiap operator pernah memasukkan dan menyimpan minimal satu meja.
- [ ] Setiap operator bisa menjelaskan perbedaan kunci pembagian dan kunci hasil.
- [ ] Kasus seri 500–500 berhasil diberi posisi 3 dan 4 tanpa mengubah skor.
- [ ] Satu kesalahan input diperbaiki, dan perubahan dicek di klasemen publik.
- [ ] Semua paham bahwa klasemen sementara menghitung skor tersimpan, belum harus terkunci.
- [ ] Link publik dibuka pada HP/incognito; pencarian nama, riwayat, dan PDF dicoba.
- [ ] Koordinator dan jalur keberatan hasil sudah disepakati.
- [ ] Ketentuan seri, walkout, peserta terlambat, diskualifikasi, dan batas protes dicatat sebagai keputusan panitia, bukan dianggap otomatis oleh aplikasi.
- [ ] Kuota dan jumlah babak tahap setelah 20 besar dikonfirmasi.
- [ ] Ada penanggung jawab backup dan hotspot.
- [ ] Mode developer dimatikan setelah latihan; peserta uji tidak tercampur dengan data resmi.

Sesudah meeting, hapus hanya turnamen yang jelas bernama LATIHAN bila memang sudah tidak diperlukan. Jangan mendemokan **Pilih semua → HAPUS** pada daftar production yang berisi turnamen asli.

## Hasil pemeriksaan paket

Lihat `support/hasil-verifikasi.json` untuk hasil uji parser file impor, jumlah peserta/komunitas, file error yang ditolak, dan pengecekan skor lokal. Tidak ada akses tulis database production selama pembuatan paket ini.
