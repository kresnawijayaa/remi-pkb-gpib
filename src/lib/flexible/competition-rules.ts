export const rulesVersion = "1.0 · 19 Oktober 2026";
export const rulesPublicUrl = "https://remi.gpibharapanindah.org/aturan";
export const rankingCriteria = ["Total poin terbesar", "Total skor terbesar", "Jumlah Gold terbanyak", "Jumlah Silver terbanyak", "Jumlah Bronze terbanyak"];
export const pointRules = [{ rank: 1, points: 5, medal: "Gold" }, { rank: 2, points: 4, medal: "Silver" }, { rank: 3, points: 3, medal: "Bronze" }, { rank: 4, points: 2, medal: "Posisi 4" }, { rank: 5, points: 1, medal: "Posisi 5" }];
export const auditExample = [
  { round: 1, score: 850, rank: 1, points: 5 },
  { round: 2, score: 620, rank: 3, points: 3 },
  { round: 3, score: 740, rank: 2, points: 4 },
  { round: 4, score: 530, rank: 4, points: 2 },
  { round: 5, score: 810, rank: 1, points: 5 },
];
export const exampleTotals = {
  points: auditExample.reduce((sum, row) => sum + row.points, 0),
  score: auditExample.reduce((sum, row) => sum + row.score, 0),
  gold: auditExample.filter(row => row.rank === 1).length,
  silver: auditExample.filter(row => row.rank === 2).length,
  bronze: auditExample.filter(row => row.rank === 3).length,
};

export const rulesSections = [
  { id: "dasar", title: "Skor bukan poin turnamen", page: 1, paragraphs: [
    "Skor adalah nilai akhir permainan yang dicatat panitia untuk setiap peserta di mejanya. Skor terbesar mendapat peringkat meja tertinggi. Peringkat meja kemudian diubah menjadi poin turnamen.",
    "Klasemen tidak langsung diurutkan berdasarkan skor saja. Total poin diperiksa lebih dahulu; total skor baru menjadi pembeda jika total poin sama. Sistem menghitung dari skor dan keputusan peringkat seri yang dimasukkan panitia, bukan membaca hasil permainan kartu secara otomatis.",
  ], bullets: [] },
  { id: "poin", title: "Poin dari peringkat meja", page: 1, paragraphs: [
    "Peringkat 1 mendapat 5 poin, peringkat 2 mendapat 4 poin, peringkat 3 mendapat 3 poin, peringkat 4 mendapat 2 poin, dan peringkat 5 mendapat 1 poin.",
    "Meja yang berisi kurang dari lima peserta tetap memakai skala yang sama: meja tiga orang mendapat 5, 4, dan 3 poin. Poin tidak dibagi rata dan tidak dinormalisasi menurut jumlah pemain. Gold, Silver, dan Bronze adalah jumlah finis di posisi 1, 2, dan 3; bukan bonus poin tambahan.",
  ], bullets: [] },
  { id: "seri", title: "Jika skor sama di satu meja", page: 1, paragraphs: [
    "Setelah semua skor meja terisi, sistem menghitung peringkat otomatis. Hanya peserta dengan skor sama yang membutuhkan keputusan peringkat manual dari panitia berdasarkan hasil pertandingan atau ketentuan seri yang diumumkan panitia.",
  ], bullets: [
    "Contoh: skor 900, 700, 500, 500, 300. Dua peserta dengan skor 500 memperebutkan peringkat 3 dan 4, bukan peringkat 1 dan 2.",
    "Panitia memilih peringkat berbeda dari posisi yang tersedia. Peserta tersebut mendapat 3 dan 2 poin, bukan berbagi peringkat atau masing-masing mendapat 3 poin.",
    "Skor tidak diubah hanya untuk memecah seri. Jika skor diubah, peringkat dihitung ulang dan keputusan manual yang terdampak perlu diperiksa kembali.",
  ] },
  { id: "klasemen", title: "Urutan klasemen: cek satu per satu", page: 2, paragraphs: [
    "Bandingkan total poin terlebih dahulu. Hanya jika sama, lanjutkan ke total skor, lalu Gold, Silver, dan Bronze secara berurutan. Begitu ditemukan perbedaan, peserta dengan nilai lebih besar ditempatkan lebih tinggi; kriteria berikutnya tidak digunakan.",
    "Total poin adalah penjumlahan poin semua babak yang sudah tersimpan. Total skor adalah penjumlahan skor semua babak yang sudah tersimpan, termasuk skor negatif jika ada. Tidak ada rata-rata, pemilihan babak terbaik, penghapusan babak terendah, atau bonus medali otomatis.",
  ], bullets: [
    "20 poin dengan total skor 3.000 tetap di atas 19 poin dengan total skor 4.000.",
    "Jika keduanya 19 poin, total skor 3.600 berada di atas 3.550, meskipun peserta dengan skor lebih rendah memiliki lebih banyak Gold.",
    "Jika poin dan total skor sama, barulah jumlah Gold dibandingkan. Jika Gold juga sama, lanjut ke Silver, lalu Bronze. Nomor peserta, nama, komunitas, dan urutan input bukan kriteria klasemen.",
  ] },
  { id: "kelolosan", title: "Kelolosan dan seri penuh", page: 2, paragraphs: [
    "Jumlah peserta lolos mengikuti pengaturan tahap yang diumumkan panitia. Zona lolos pada klasemen sementara belum merupakan keputusan akhir: skor meja lain atau babak berikutnya masih dapat mengubah posisi.",
    "Jika semua lima kriteria klasemen sama di batas kelolosan, cara penyelesaiannya diputuskan panitia dan diumumkan saat acara. Sistem tidak mempunyai kriteria pembeda tambahan untuk seri penuh. Nomor baris yang tampil tidak boleh dianggap sebagai pemecah seri resmi.",
    "Panitia harus menyelesaikan dan mencatat keputusan seri penuh sebelum menetapkan kelolosan. Pada tahap lanjutan yang dibuat sebagai turnamen baru, poin dan skor dimulai dari nol; hasil tahap sebelumnya tidak otomatis dijumlahkan.",
  ], bullets: [] },
  { id: "meja", title: "Pembagian meja dan pilihan shuffle", page: 3, paragraphs: [
    "Kapasitas meja mengikuti pengaturan, maksimal lima orang. Peserta dibagi semerata mungkin dengan selisih jumlah pemain maksimal satu orang. Dengan kapasitas lima, 6 peserta dibagi 3-3 dan 12 peserta dibagi 4-4-4, bukan 5-5-2.",
    "Shuffle Rotasi berusaha mengurangi pertemuan ulang sepanjang babak yang sudah dikunci sekaligus memisahkan peserta satu komunitas. Hasilnya bukan jaminan mutlak semua konflik hilang. Komunitas dominan atau komposisi peserta tertentu dapat membuat pertemuan sekomunitas tidak terhindarkan. Contoh: 100 peserta dari satu komunitas dalam 40 meja tidak mungkin seluruhnya dibatasi dua orang per meja.",
    "Shuffle Tier, jika dipakai panitia, tersedia mulai babak 2 setelah hasil babak sebelumnya dikunci. Acuannya hanya peringkat meja babak sebelumnya, bukan klasemen kumulatif: peringkat 1-2 dikelompokkan sebagai Top, peringkat 3-5 sebagai Pengejar, sambil memisahkan pasangan Top dari meja asal yang sama sebisa mungkin. Meja campuran dapat diperlukan. Riwayat pertemuan dan komunitas bukan prioritas utama mode ini.",
    "Panitia dapat meninjau dan menukar peserta sebelum pembagian dikunci. Susunan yang berlaku adalah pembagian terkunci terbaru. PDF merupakan salinan pada waktu diunduh; jika ada koreksi, periksa kembali link pembagian web.",
  ], bullets: [] },
  { id: "status", title: "Kapan hasil dianggap resmi?", page: 3, paragraphs: [
    "Klasemen sementara sudah menghitung hasil meja yang disimpan, meskipun hasil babaknya belum dikunci. Peserta dengan jumlah babak bermain berbeda belum dapat dibandingkan sebagai hasil akhir. Hasil meja yang belum masuk bukan berarti peserta mendapat nol poin.",
  ], bullets: [
    "Pembagian dikunci: susunan meja resmi dan dapat dibagikan. Ini belum mengesahkan skor.",
    "Hasil babak dikunci: seluruh skor babak sudah diperiksa dan disahkan. Hasil dapat menjadi dasar Shuffle Tier berikutnya.",
    "Peserta lolos dikunci: panitia sudah menetapkan kelolosan setelah seluruh skor lengkap dan hasil babak dikunci. Jika koreksi diperlukan, kunci yang berkaitan harus dibuka melalui prosedur panitia.",
  ] },
  { id: "cek", title: "Cara peserta menghitung ulang hasilnya", page: 4, paragraphs: [
    "Buka link klasemen dari panitia, cari nama atau nomor peserta, lalu buka Riwayat poin per babak. Cocokkan meja, skor, peringkat, dan poin dengan catatan pertandingan. Jumlahkan seluruh poin dan skor secara terpisah, lalu hitung Gold, Silver, dan Bronze dari peringkat meja.",
    "Contoh lima babak di bawah menghasilkan 19 poin, total skor 3.550, 2 Gold, 1 Silver, dan 1 Bronze. Angka ini hanya contoh perhitungan, bukan data peserta sebenarnya.",
    "Jika poin Anda sama dengan peserta di atas, periksa total skor terlebih dahulu. Halaman klasemen publik diperbarui otomatis setiap 30 detik; gunakan Perbarui sekarang dan perhatikan waktu pembaruan agar membandingkan versi data yang sama.",
  ], bullets: [] },
  { id: "koreksi", title: "Jika ditemukan perbedaan atau keberatan", page: 4, paragraphs: [
    "Perhitungan otomatis mengurangi risiko salah menjumlahkan, tetapi ketepatan hasil tetap bergantung pada skor yang dicatat dan keputusan seri yang benar. Peserta tetap boleh meminta pemeriksaan; penggunaan sistem bukan alasan untuk menolak bukti kesalahan input.",
  ], bullets: [
    "Sampaikan nama/nomor peserta, babak, meja, skor atau peringkat yang dipersoalkan, serta bukti catatan hasil kepada panitia.",
    "Panitia mencocokkan bukti dengan hasil meja. Jika salah input terbukti, panitia memperbaiki skor/peringkat melalui prosedur koreksi dan memeriksa dampaknya pada klasemen serta pembagian berikutnya.",
    "Koreksi dapat mengubah posisi dan kelolosan. Pastikan memakai hasil terbaru, bukan tangkapan layar atau PDF lama. Batas waktu pengajuan keberatan mengikuti pengumuman panitia.",
  ] },
  { id: "lapangan", title: "Hal yang tetap menjadi keputusan panitia", page: 4, paragraphs: [
    "Nilai kombinasi kartu, durasi permainan, cara memecah skor seri di lapangan, sanksi, keterlambatan, walkout, diskualifikasi, dan penyelesaian seri penuh mengikuti ketentuan panitia yang diumumkan saat acara. Aplikasi mencatat pembagian dan hasil; aplikasi tidak otomatis memutuskan kejadian-kejadian tersebut. Halaman ini menjelaskan sistem perhitungan, bukan menggantikan seluruh peraturan permainan kartu.",
  ], bullets: [] },
] as const;
