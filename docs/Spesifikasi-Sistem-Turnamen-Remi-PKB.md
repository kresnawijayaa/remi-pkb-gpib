# Spesifikasi Sistem Turnamen Remi PKB

## 1. Ringkasan Sistem

Sistem ini dibuat untuk membantu panitia Persekutuan Kaum Bapak dalam menjalankan turnamen Remi 13 secara rapi, cepat, dan mudah dipahami.

Sistem tidak menggantikan seluruh pencatatan manual di meja. Setiap meja tetap boleh menggunakan kertas panpel untuk mencatat skor per kocok. Setelah babak selesai, panpel hanya perlu memasukkan **total skor akhir** setiap peserta ke sistem.

Sistem akan menangani:

1. Data peserta.
2. Master komunitas/sektor.
3. Pembagian meja.
4. Rotasi peserta antar babak.
5. Input skor akhir per meja.
6. Konversi ranking meja menjadi poin turnamen.
7. Klasemen penyisihan.
8. Penentuan 10 finalis.
9. Pembagian 2 meja final.
10. Penentuan juara akhir.
11. Export hasil ke Excel/PDF.

---

## 2. Konsep Turnamen

Format yang digunakan adalah **Konsep B1: Akumulasi Ranking Poin**.

Artinya:

* Setiap babak, peserta mendapat ranking berdasarkan skor di meja masing-masing.
* Skor tertinggi di meja menjadi ranking 1.
* Ranking 1 mendapat 1 poin turnamen.
* Ranking 2 mendapat 2 poin turnamen.
* Ranking 3 mendapat 3 poin turnamen.
* Ranking 4 mendapat 4 poin turnamen.
* Ranking 5 mendapat 5 poin turnamen.
* Setelah 4 babak penyisihan, total poin dijumlahkan.
* Peserta dengan total poin paling kecil berada di peringkat atas.
* Jika total poin sama, digunakan total skor sebagai pembanding.

Prinsip utama:

```text
Skor digunakan untuk menentukan ranking di meja.
Ranking meja dikonversi menjadi poin turnamen.
Total poin terkecil adalah yang terbaik.
Total skor hanya menjadi pembanding jika total poin sama.
```

---

## 3. Contoh Alur Turnamen

Jumlah peserta: 50 orang.

Babak penyisihan:

```text
50 peserta
10 meja
1 meja 5 peserta
4 babak penyisihan
```

Setiap babak:

```text
Maksimal 25 menit atau 5 kali kocok, mana yang lebih dulu.
Setelah babak selesai, panpel memasukkan total skor akhir setiap peserta.
Sistem otomatis menentukan ranking meja dan poin turnamen.
```

Setelah 4 babak:

```text
Sistem menghitung klasemen penyisihan.
Sistem mengambil 10 peserta terbaik sebagai finalis.
```

Final:

```text
10 finalis
2 meja final
1 meja 5 peserta
Hasil final menentukan juara akhir.
```

---

## 4. Stack Teknologi yang Disarankan

### 4.1 Frontend

Gunakan:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

Alasan:

* Cocok untuk dashboard sederhana.
* Bisa dibuka di HP, tablet, dan laptop.
* Tidak perlu install aplikasi.
* Mudah dibuat responsive.
* Komponen UI bisa dibuat besar dan jelas untuk panitia/bapak-bapak.

### 4.2 Backend dan Database

Gunakan:

```text
Supabase PostgreSQL
Supabase Auth opsional
Supabase Realtime opsional
```

Alasan:

* Cepat setup.
* Database Postgres rapi.
* Bisa export data.
* Bisa pakai Row Level Security jika nanti butuh.
* Cocok untuk sistem event kecil-menengah.

### 4.3 Hosting

Gunakan:

```text
Vercel untuk Next.js
Supabase untuk database
```

Alternatif:

```text
VPS pribadi + Docker + PostgreSQL
```

Untuk MVP dan event gereja, Vercel + Supabase lebih praktis.

---

## 5. Role Pengguna

Sistem cukup memiliki 3 role.

### 5.1 Admin

Admin adalah panitia inti.

Admin bisa:

* Membuat turnamen.
* Mengatur jumlah babak.
* Mengatur jumlah meja.
* Menambah peserta.
* Mengelola komunitas/sektor.
* Generate pembagian meja.
* Membuka dan mengunci babak.
* Mengubah hasil jika ada koreksi.
* Melihat klasemen.
* Generate finalis.
* Generate meja final.
* Export hasil.

### 5.2 Pencatat Meja

Pencatat meja adalah panpel yang bertugas input skor di meja tertentu.

Pencatat meja bisa:

* Membuka halaman meja yang ditugaskan.
* Melihat daftar peserta di meja.
* Input skor akhir peserta.
* Simpan draft.
* Kirim hasil meja.

Pencatat meja tidak bisa:

* Mengubah peserta.
* Generate babak.
* Mengubah hasil meja lain.
* Mengubah pengaturan turnamen.

### 5.3 Viewer

Viewer digunakan untuk layar umum/proyektor.

Viewer bisa melihat:

* Jadwal meja.
* Status babak.
* Klasemen sementara.
* Finalis.
* Hasil juara.

Viewer tidak bisa mengubah data.

---

## 6. Master Komunitas/Sektor

### 6.1 Masalah yang Harus Dicegah

Jangan menggunakan input teks bebas langsung untuk komunitas/sektor peserta.

Contoh masalah:

```text
Sektor 1
sektor 1
SEKTOR 1
Sektor I
Sektor Satu
```

Semua contoh di atas bisa dianggap berbeda oleh sistem, padahal maksudnya sama.

Jika ini terjadi, rotasi tidak akan maksimal karena sistem mengira peserta berasal dari komunitas berbeda.

### 6.2 Solusi

Gunakan master data komunitas.

Saat input peserta, field komunitas/sektor harus berupa:

```text
Select existing community
atau
Create new community
```

Jangan berupa teks bebas biasa.

### 6.3 Contoh UI Input Peserta

Field peserta:

```text
Nama Peserta: [________________]
Komunitas/Sektor: [ Pilih komunitas... v ] [+ Buat Baru]
Nomor HP: [________________] opsional
```

Jika klik `+ Buat Baru`, tampil modal:

```text
Nama Komunitas/Sektor:
[________________]

Contoh:
- Sektor 1
- Sektor 2
- PKB Gabungan
- Tamu
- Menara Kasih
```

Setelah dibuat, komunitas tersebut masuk ke master data dan bisa dipilih untuk peserta berikutnya.

### 6.4 Aturan Normalisasi Nama Komunitas

Saat membuat komunitas baru, sistem perlu melakukan normalisasi sederhana.

Contoh:

```text
Input: "  sektor 1  "
Disimpan sebagai display_name: "Sektor 1"
Disimpan sebagai normalized_name: "sektor 1"
```

Jika user mencoba membuat komunitas baru dengan normalized name yang sama, sistem menolak.

Contoh:

```text
Komunitas "Sektor 1" sudah ada.
Silakan pilih dari daftar komunitas.
```

### 6.5 Struktur Data Komunitas

Tabel: `communities`

```sql
id uuid primary key
tournament_id uuid nullable
name text not null
normalized_name text not null
created_at timestamp
updated_at timestamp
```

Catatan:

* Jika komunitas hanya berlaku untuk 1 turnamen, gunakan `tournament_id`.
* Jika komunitas ingin dipakai lintas event, `tournament_id` boleh nullable.
* Untuk MVP, lebih mudah komunitas dibuat per turnamen.

Unique constraint:

```sql
unique(tournament_id, normalized_name)
```

---

## 7. Data Peserta

Tabel: `participants`

```sql
id uuid primary key
tournament_id uuid not null
community_id uuid null
participant_number integer not null
name text not null
phone text null
status text not null default 'active'
created_at timestamp
updated_at timestamp
```

Contoh status:

```text
active
withdrawn
disqualified
```

Untuk MVP, cukup gunakan `active`.

### 7.1 Input Manual

Admin bisa menambah peserta satu per satu.

### 7.2 Import CSV/Excel

Format import:

```csv
No,Nama,Komunitas,No HP
1,Pak Andri,Sektor 1,
2,Pak Edo,Sektor 2,
3,Pak Jone,Sektor 1,
```

Saat import:

1. Sistem membaca nama komunitas.
2. Sistem normalisasi nama komunitas.
3. Jika komunitas sudah ada, gunakan `community_id` yang ada.
4. Jika belum ada, buat komunitas baru.
5. Peserta disimpan dengan `community_id`.

### 7.3 Validasi Peserta

Validasi minimal:

* Nama wajib diisi.
* Nomor peserta wajib unik dalam turnamen.
* Komunitas boleh kosong, tapi sebaiknya diisi.
* Peserta aktif tidak boleh dobel nama persis dalam turnamen, kecuali admin mengizinkan.

---

## 8. Struktur Turnamen

Tabel: `tournaments`

```sql
id uuid primary key
name text not null
event_date date null
location text null
status text not null default 'draft'
qualification_round_count integer not null default 4
players_per_table integer not null default 5
finalist_count integer not null default 10
created_at timestamp
updated_at timestamp
```

Status turnamen:

```text
draft
active
finished
cancelled
```

---

## 9. Struktur Babak

Tabel: `rounds`

```sql
id uuid primary key
tournament_id uuid not null
round_number integer not null
round_type text not null
status text not null default 'draft'
created_at timestamp
updated_at timestamp
locked_at timestamp null
```

`round_type`:

```text
qualification
final
```

`status`:

```text
draft
active
locked
cancelled
```

Contoh:

```text
Babak 1: qualification
Babak 2: qualification
Babak 3: qualification
Babak 4: qualification
Final: final
```

---

## 10. Struktur Meja

Tabel: `match_tables`

```sql
id uuid primary key
tournament_id uuid not null
round_id uuid not null
table_number integer not null
table_name text null
status text not null default 'draft'
created_at timestamp
updated_at timestamp
submitted_at timestamp null
submitted_by uuid null
```

Status meja:

```text
draft
active
submitted
verified
locked
```

Untuk MVP:

```text
draft
submitted
locked
```

---

## 11. Peserta di Meja

Tabel: `table_players`

```sql
id uuid primary key
tournament_id uuid not null
round_id uuid not null
table_id uuid not null
participant_id uuid not null
seat_number integer not null
score integer null
table_rank integer null
tournament_point integer null
created_at timestamp
updated_at timestamp
```

Contoh isi setelah babak selesai:

```text
Pak Edo
score = 605
table_rank = 1
tournament_point = 1

Pak Rasendira
score = 480
table_rank = 2
tournament_point = 2

Pak Andri
score = 300
table_rank = 3
tournament_point = 3
```

---

## 12. Aturan Penilaian Penyisihan

### 12.1 Input Skor

Panpel hanya input skor akhir.

Contoh:

```text
Meja 1 - Babak 1

Pak A: 300
Pak B: -50
Pak C: 120
Pak D: 500
Pak E: 200
```

### 12.2 Ranking Meja

Sistem mengurutkan berdasarkan skor tertinggi.

Contoh hasil:

```text
Pak D: 500 => ranking 1
Pak A: 300 => ranking 2
Pak E: 200 => ranking 3
Pak C: 120 => ranking 4
Pak B: -50 => ranking 5
```

### 12.3 Konversi Ranking ke Poin Turnamen

```text
Ranking 1 => 1 poin
Ranking 2 => 2 poin
Ranking 3 => 3 poin
Ranking 4 => 4 poin
Ranking 5 => 5 poin
```

Contoh:

```text
Pak D: ranking 1 => 1 poin
Pak A: ranking 2 => 2 poin
Pak E: ranking 3 => 3 poin
Pak C: ranking 4 => 4 poin
Pak B: ranking 5 => 5 poin
```

### 12.4 Jika Skor Sama di Meja

Jika dalam 1 meja ada skor sama, sistem jangan otomatis memutuskan terlalu jauh tanpa persetujuan panitia.

Pilihan rule yang disarankan:

```text
Jika skor sama dalam satu meja:
1. Sistem memberi tanda "skor sama".
2. Panpel/admin wajib memilih ranking manual.
3. Ranking manual disimpan beserta catatan.
```

Contoh:

```text
Pak A: 300
Pak B: 300
```

Sistem tampilkan:

```text
Ada skor sama antara Pak A dan Pak B.
Silakan tentukan ranking sesuai keputusan panpel/wasit.
```

Admin memilih:

```text
Pak B ranking 2
Pak A ranking 3
```

Catatan:

```text
Ranking ditentukan berdasarkan kesepakatan meja.
```

---

## 13. Klasemen Penyisihan

Klasemen dihitung dari seluruh hasil babak penyisihan yang sudah dikunci.

Data yang ditampilkan:

```text
Rank
Nama Peserta
Komunitas
Total Poin
Total Skor
Jumlah Ranking 1
Jumlah Ranking 2
Jumlah Ranking 3
Babak 1
Babak 2
Babak 3
Babak 4
```

### 13.1 Urutan Klasemen

Urutan klasemen:

```text
1. Total poin terkecil
2. Total skor terbesar
3. Jumlah ranking 1 terbanyak
4. Jumlah ranking 2 terbanyak
5. Jumlah ranking 3 terbanyak
6. Keputusan panitia / tiebreak manual
```

### 13.2 Contoh Klasemen

```text
Rank | Nama     | Komunitas | Total Poin | Total Skor | R1 | R2 | B1 | B2 | B3 | B4
1    | Pak A    | Sektor 1  | 5          | 980        | 3  | 1  | 1  | 1  | 2  | 1
2    | Pak B    | Sektor 2  | 7          | 850        | 2  | 1  | 2  | 1  | 1  | 3
3    | Pak C    | Sektor 3  | 8          | 790        | 2  | 0  | 1  | 3  | 1  | 3
```

---

## 14. Penentuan Finalis

Setelah babak 1 sampai 4 dikunci, admin klik:

```text
Generate Finalis
```

Sistem mengambil 10 peserta terbaik berdasarkan klasemen penyisihan.

Aturan:

```text
1. Ambil 10 peserta dengan total poin terkecil.
2. Jika total poin sama, ambil total skor terbesar.
3. Jika masih sama, ambil jumlah ranking 1 terbanyak.
4. Jika masih sama, ambil jumlah ranking 2 terbanyak.
5. Jika masih sama dan memengaruhi slot final, admin harus menentukan manual.
```

Contoh kasus:

```text
Rank 10: Pak A total poin 10, total skor 500
Rank 11: Pak B total poin 10, total skor 500
```

Sistem tampilkan:

```text
Slot final terakhir memiliki hasil seri.
Silakan pilih peserta yang masuk final atau lakukan tiebreak manual.
```

---

## 15. Pembagian Meja Final

Final terdiri dari 10 peserta dan 2 meja.

Sistem membagi berdasarkan ranking penyisihan agar seimbang.

Format pembagian:

```text
Meja Final A:
Rank 1
Rank 4
Rank 5
Rank 8
Rank 9

Meja Final B:
Rank 2
Rank 3
Rank 6
Rank 7
Rank 10
```

Alasan:

* Ranking atas tidak menumpuk di satu meja.
* Meja final lebih seimbang.
* Mudah dijelaskan ke peserta.

---

## 16. Aturan Penentuan Juara Final

Final tetap input skor per meja.

Di setiap meja final, sistem menentukan ranking berdasarkan skor tertinggi.

Kemudian juara akhir ditentukan dengan pola berikut:

```text
Ranking 1 Meja A dan Ranking 1 Meja B dibandingkan untuk Juara 1 dan 2.
Ranking 2 Meja A dan Ranking 2 Meja B dibandingkan untuk Juara 3 dan 4.
Ranking 3 Meja A dan Ranking 3 Meja B dibandingkan untuk Juara 5 dan 6.
Ranking 4 Meja A dan Ranking 4 Meja B dibandingkan untuk Juara 7 dan 8.
Ranking 5 Meja A dan Ranking 5 Meja B dibandingkan untuk Juara 9 dan 10.
```

Pembanding antar meja:

```text
1. Ranking final
2. Skor final tertinggi
3. Total poin penyisihan terkecil
4. Total skor penyisihan terbesar
5. Keputusan panitia
```

Contoh:

```text
Meja Final A:
Pak A ranking 1 skor 520
Pak C ranking 2 skor 300

Meja Final B:
Pak B ranking 1 skor 460
Pak D ranking 2 skor 350
```

Hasil:

```text
Juara 1: Pak A
Juara 2: Pak B
Juara 3: Pak D
Juara 4: Pak C
```

---

## 17. Rotasi Peserta Antar Babak

Rotasi peserta adalah bagian penting agar pertandingan terasa adil.

Ada 2 tujuan utama:

```text
1. Peserta sebisa mungkin tidak bertemu orang yang sama berulang kali.
2. Peserta dari komunitas/sektor yang sama sebisa mungkin tidak menumpuk di meja yang sama.
```

Namun, sistem harus tetap fleksibel.

Prinsip:

```text
Sistem berusaha mencari pembagian terbaik.
Jika kondisi ideal tidak mungkin, sistem tetap membuat pembagian meja.
Panitia bisa melakukan penyesuaian manual jika diperlukan.
```

---

## 18. Aturan Rotasi

### 18.1 Babak 1

Babak 1 bisa dibuat dengan undian/random.

Namun tetap usahakan:

```text
1 meja tidak terlalu banyak dari komunitas yang sama.
```

Jika peserta berasal dari banyak komunitas, target ideal:

```text
Maksimal 1 peserta dari komunitas yang sama dalam 1 meja.
```

Jika tidak memungkinkan:

```text
Maksimal 2 peserta dari komunitas yang sama dalam 1 meja.
```

### 18.2 Babak 2 sampai Babak 4

Saat generate babak berikutnya, sistem harus memperhatikan riwayat pertemuan.

Prioritas rotasi:

```text
Prioritas 1: Hindari peserta bertemu lawan yang sama dari babak sebelumnya.
Prioritas 2: Hindari peserta bertemu lawan yang pernah ditemui di babak mana pun.
Prioritas 3: Hindari komunitas/sektor yang sama menumpuk di 1 meja.
Prioritas 4: Seimbangkan jumlah peserta per meja.
```

Untuk 50 peserta dan 10 meja, idealnya:

```text
1 meja = 5 peserta
```

---

## 19. Sistem Skor Rotasi

Untuk mempermudah development, gunakan sistem penalty score.

Sistem akan mencoba banyak kemungkinan pembagian meja, lalu memilih pembagian dengan penalty paling kecil.

### 19.1 Penalty

Contoh penalty:

```text
+1000 jika peserta pernah bertemu orang yang sama di babak sebelumnya.
+500 jika peserta pernah bertemu orang yang sama di babak lain.
+300 jika dalam satu meja ada lebih dari 2 orang dari komunitas yang sama.
+100 jika dalam satu meja ada tepat 2 orang dari komunitas yang sama.
+50 jika jumlah peserta meja tidak ideal.
```

Semakin kecil penalty, semakin bagus pembagian meja.

### 19.2 Contoh Kasus

Peserta:

```text
Pak A - Sektor 1
Pak B - Sektor 1
Pak C - Sektor 2
Pak D - Sektor 3
Pak E - Sektor 4
```

Jika satu meja berisi:

```text
Pak A, Pak B, Pak C, Pak D, Pak E
```

Maka ada 2 peserta dari Sektor 1.

Penalty:

```text
+100
```

Masih boleh, tapi sistem akan mencari opsi yang lebih baik jika ada.

Jika satu meja berisi:

```text
Pak A, Pak B, Pak F
```

dan semua dari Sektor 1, maka penalty lebih besar:

```text
+300 atau lebih
```

---

## 20. Algoritma Generate Meja

Gunakan pendekatan sederhana dan aman untuk MVP.

### 20.1 Input

```text
participants: daftar peserta aktif
previous_rounds: hasil pembagian meja babak sebelumnya
tables_count: jumlah meja
players_per_table: jumlah pemain per meja
round_number: babak yang ingin dibuat
```

### 20.2 Output

```text
Daftar meja untuk babak baru
```

Contoh output:

```json
[
  {
    "table_number": 1,
    "players": ["Pak A", "Pak B", "Pak C", "Pak D", "Pak E"]
  },
  {
    "table_number": 2,
    "players": ["Pak F", "Pak G", "Pak H", "Pak I", "Pak J"]
  }
]
```

### 20.3 Langkah Algoritma

Pseudocode:

```text
function generateRoundTables(participants, previousRounds):
    bestArrangement = null
    bestPenalty = infinity

    repeat 1000 times:
        shuffled = randomShuffle(participants)
        arrangement = splitIntoTables(shuffled, playersPerTable)
        penalty = calculateArrangementPenalty(arrangement, previousRounds)

        if penalty < bestPenalty:
            bestPenalty = penalty
            bestArrangement = arrangement

        if penalty == 0:
            break

    return bestArrangement
```

Untuk MVP, 1000 percobaan sudah cukup untuk 50 peserta.

Jika ingin lebih bagus, bisa naik ke:

```text
5000 percobaan
```

Namun jangan terlalu besar agar proses tetap cepat.

---

## 21. Fungsi Hitung Penalty Rotasi

Pseudocode:

```text
function calculateArrangementPenalty(arrangement, previousRounds):
    totalPenalty = 0

    for each table in arrangement:
        totalPenalty += communityPenalty(table.players)
        totalPenalty += repeatedMeetingPenalty(table.players, previousRounds)

    return totalPenalty
```

---

## 22. Community Penalty

Pseudocode:

```text
function communityPenalty(players):
    penalty = 0
    groupByCommunity = group players by community_id

    for each community in groupByCommunity:
        count = number of players in this community

        if count == 1:
            penalty += 0

        if count == 2:
            penalty += 100

        if count == 3:
            penalty += 300

        if count == 4:
            penalty += 600

        if count >= 5:
            penalty += 1000

    return penalty
```

Catatan:

* Jika `community_id` kosong/null, jangan dihitung sebagai komunitas yang sama.
* Peserta tanpa komunitas dianggap netral.

---

## 23. Repeated Meeting Penalty

Sistem perlu tahu siapa pernah bertemu siapa.

Buat fungsi:

```text
getPreviousOpponents(participant_id)
```

Contoh data:

```text
Pak A pernah 1 meja dengan:
- Pak B di Babak 1
- Pak C di Babak 1
- Pak D di Babak 2
```

Pseudocode:

```text
function repeatedMeetingPenalty(players, previousRounds):
    penalty = 0

    for each pair of players in table:
        meetingCount = countPreviousMeetings(playerA, playerB, previousRounds)
        metInPreviousRound = checkMetInPreviousRound(playerA, playerB, previousRounds)

        if metInPreviousRound:
            penalty += 1000
        else if meetingCount > 0:
            penalty += 500 * meetingCount

    return penalty
```

Contoh:

```text
Pak A dan Pak B sudah pernah bertemu 1 kali:
penalty +500

Pak A dan Pak B bertemu di babak tepat sebelumnya:
penalty +1000
```

---

## 24. Manual Override Rotasi

Admin harus bisa mengubah hasil generate meja.

Fitur:

```text
Drag and drop peserta antar meja
atau
Tombol pindahkan peserta
```

Saat admin memindahkan peserta, sistem menampilkan warning.

Contoh warning:

```text
Peringatan:
Pak A dan Pak B sudah pernah bertemu di Babak 1.
Sektor 1 sudah ada 3 orang di Meja 2.
```

Namun sistem tetap mengizinkan admin menyimpan.

Alasan:

```text
Keputusan akhir tetap di panitia.
```

---

## 25. Generate Babak dengan Status

Jangan langsung mengaktifkan hasil generate.

Flow yang disarankan:

```text
1. Admin klik Generate Babak 2.
2. Sistem membuat draft meja.
3. Admin melihat hasil rotasi.
4. Admin boleh edit manual.
5. Admin klik Aktifkan Babak.
6. Peserta/panpel baru bisa melihat meja babak tersebut.
```

Status babak:

```text
draft => active => locked
```

---

## 26. Input Hasil Meja

### 26.1 Halaman Pencatat Meja

Contoh tampilan:

```text
Babak 1 - Meja 3

Masukkan total skor akhir sesuai kertas panpel.

Pak Jone       [ -290 ]
Pak Yeshy      [   90 ]
Pak Rasendira  [  480 ]
Pak Andri      [  300 ]
Pak Edo        [  605 ]

[Simpan Draft]
[Kirim Hasil Meja]
```

### 26.2 Setelah Klik Kirim

Sistem menampilkan konfirmasi:

```text
Hasil Meja 3 - Babak 1

Ranking | Peserta     | Skor | Poin
1       | Pak Edo     | 605  | 1
2       | Pak Rasendira | 480 | 2
3       | Pak Andri   | 300  | 3
4       | Pak Yeshy   | 90   | 4
5       | Pak Jone    | -290 | 5

Apakah hasil sudah benar?
[Ya, Kirim]
[Kembali Edit]
```

Setelah dikirim:

```text
Status meja menjadi submitted.
```

Admin masih bisa membuka koreksi sebelum babak dikunci.

---

## 27. Kunci Babak

Admin hanya bisa mengunci babak jika semua meja sudah submit hasil.

Validasi:

```text
Jika masih ada meja belum submit:
Babak belum bisa dikunci.
```

Setelah babak dikunci:

```text
- Hasil tidak bisa diedit oleh pencatat meja.
- Klasemen diperbarui.
- Babak berikutnya boleh dibuat.
```

Admin super boleh membuka kunci jika ada koreksi khusus.

---

## 28. Dashboard Admin

Dashboard admin minimal berisi:

```text
Nama Turnamen
Status Turnamen
Jumlah Peserta
Babak Aktif
Jumlah Meja
Status Input Hasil
Tombol Generate Babak
Tombol Lihat Klasemen
Tombol Generate Final
Tombol Export
```

Contoh:

```text
Turnamen Remi PKB HUT 2026

Peserta: 50
Babak aktif: Babak 2
Meja selesai input: 7 / 10

[Kelola Peserta]
[Lihat Meja Babak 2]
[Lihat Klasemen]
[Generate Babak Berikutnya]
```

---

## 29. Halaman Klasemen

Tabel klasemen:

```text
Rank | Nama | Komunitas | Total Poin | Total Skor | R1 | R2 | R3 | B1 | B2 | B3 | B4
```

Warna/sorotan:

```text
Rank 1-10 diberi label "Zona Final"
Rank di bawah 10 normal
Jika tie, beri tanda "seri"
```

Contoh:

```text
1. Pak A - Total Poin 5 - Zona Final
2. Pak B - Total Poin 7 - Zona Final
...
10. Pak J - Total Poin 12 - Zona Final
11. Pak K - Total Poin 12
```

Jika rank 10 dan 11 total poin sama, sistem tetap pakai tie-breaker.

---

## 30. Halaman Viewer / Proyektor

Halaman viewer harus bersih dan besar.

Menu viewer:

```text
1. Daftar Meja Babak Aktif
2. Status Input Hasil
3. Klasemen Sementara
4. Finalis
5. Juara
```

Tidak perlu tombol edit.

---

## 31. Export

Export minimal:

### 31.1 Export Peserta

Kolom:

```text
No Peserta
Nama
Komunitas
Status
```

### 31.2 Export Hasil Per Babak

Kolom:

```text
Babak
Meja
Seat
Nama
Komunitas
Skor
Ranking Meja
Poin Turnamen
```

### 31.3 Export Klasemen

Kolom:

```text
Rank
Nama
Komunitas
Total Poin
Total Skor
Jumlah Ranking 1
Jumlah Ranking 2
Jumlah Ranking 3
Babak 1 Rank
Babak 1 Skor
Babak 2 Rank
Babak 2 Skor
Babak 3 Rank
Babak 3 Skor
Babak 4 Rank
Babak 4 Skor
```

### 31.4 Export Final

Kolom:

```text
Juara
Nama
Komunitas
Meja Final
Ranking Meja Final
Skor Final
Total Poin Penyisihan
Total Skor Penyisihan
```

---

## 32. Rekomendasi Struktur Folder Next.js

Contoh struktur:

```text
src/
  app/
    page.tsx
    tournaments/
      page.tsx
      [tournamentId]/
        page.tsx
        participants/
          page.tsx
        communities/
          page.tsx
        rounds/
          page.tsx
          [roundId]/
            page.tsx
        tables/
          [tableId]/
            page.tsx
        standings/
          page.tsx
        final/
          page.tsx
        viewer/
          page.tsx
  components/
    ui/
    tournament/
      ParticipantForm.tsx
      CommunitySelect.tsx
      RoundTableCard.tsx
      ScoreInputTable.tsx
      StandingsTable.tsx
      FinalistsTable.tsx
  lib/
    supabase/
      client.ts
      server.ts
    tournament/
      scoring.ts
      standings.ts
      rotation.ts
      final.ts
      normalization.ts
  types/
    tournament.ts
```

---

## 33. Fungsi Penting

### 33.1 Normalize Community Name

File:

```text
src/lib/tournament/normalization.ts
```

Pseudocode:

```ts
export function normalizeCommunityName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
```

Untuk display name:

```ts
export function formatCommunityDisplayName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
```

Catatan:

```text
"Sektor 1" tetap menjadi "Sektor 1".
"sektor 1" menjadi "Sektor 1".
"  sektor   1 " menjadi "Sektor 1".
```

### 33.2 Calculate Table Ranking

File:

```text
src/lib/tournament/scoring.ts
```

Pseudocode:

```ts
type PlayerScore = {
  participantId: string;
  score: number;
};

export function calculateTableRanking(scores: PlayerScore[]) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return sorted.map((item, index) => ({
    participantId: item.participantId,
    score: item.score,
    tableRank: index + 1,
    tournamentPoint: index + 1,
  }));
}
```

Catatan:

```text
Jika ada skor sama, function ini perlu return flag hasTie = true.
Jika hasTie = true, admin/panpel harus menentukan ranking manual.
```

### 33.3 Calculate Standings

File:

```text
src/lib/tournament/standings.ts
```

Pseudocode:

```ts
export function calculateStandings(tablePlayers) {
  const map = new Map();

  for (const row of tablePlayers) {
    const current = map.get(row.participantId) ?? {
      participantId: row.participantId,
      totalPoint: 0,
      totalScore: 0,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
      rounds: [],
    };

    current.totalPoint += row.tournamentPoint;
    current.totalScore += row.score;

    if (row.tableRank === 1) current.firstPlaceCount += 1;
    if (row.tableRank === 2) current.secondPlaceCount += 1;
    if (row.tableRank === 3) current.thirdPlaceCount += 1;

    current.rounds.push({
      roundId: row.roundId,
      score: row.score,
      tableRank: row.tableRank,
      tournamentPoint: row.tournamentPoint,
    });

    map.set(row.participantId, current);
  }

  return [...map.values()].sort((a, b) => {
    if (a.totalPoint !== b.totalPoint) {
      return a.totalPoint - b.totalPoint;
    }

    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;
    }

    if (a.firstPlaceCount !== b.firstPlaceCount) {
      return b.firstPlaceCount - a.firstPlaceCount;
    }

    if (a.secondPlaceCount !== b.secondPlaceCount) {
      return b.secondPlaceCount - a.secondPlaceCount;
    }

    if (a.thirdPlaceCount !== b.thirdPlaceCount) {
      return b.thirdPlaceCount - a.thirdPlaceCount;
    }

    return 0;
  });
}
```

---

## 34. Fungsi Generate Rotasi

File:

```text
src/lib/tournament/rotation.ts
```

Pseudocode:

```ts
type Participant = {
  id: string;
  name: string;
  communityId: string | null;
};

type PreviousTable = {
  roundNumber: number;
  players: Participant[];
};

export function generateRotation({
  participants,
  previousTables,
  tableCount,
  playersPerTable,
  attemptCount = 3000,
}: {
  participants: Participant[];
  previousTables: PreviousTable[];
  tableCount: number;
  playersPerTable: number;
  attemptCount?: number;
}) {
  let bestArrangement = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    const shuffled = shuffle(participants);
    const arrangement = splitIntoTables(shuffled, tableCount, playersPerTable);
    const penalty = calculateArrangementPenalty(arrangement, previousTables);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestArrangement = arrangement;
    }

    if (penalty === 0) {
      break;
    }
  }

  return {
    arrangement: bestArrangement,
    penalty: bestPenalty,
  };
}
```

---

## 35. Split Into Tables

Pseudocode:

```ts
function splitIntoTables(participants, tableCount, playersPerTable) {
  const tables = [];

  for (let i = 0; i < tableCount; i++) {
    tables.push({
      tableNumber: i + 1,
      players: [],
    });
  }

  participants.forEach((participant, index) => {
    const tableIndex = index % tableCount;
    tables[tableIndex].players.push(participant);
  });

  return tables;
}
```

Catatan:

```text
Dengan 50 peserta, 10 meja, hasilnya tiap meja 5 orang.
Jika peserta tidak pas kelipatan 5, sistem tetap membagi merata.
```

Contoh 48 peserta:

```text
Meja 1-8 isi 5 orang
Meja 9-10 isi 4 orang
```

---

## 36. Calculate Arrangement Penalty

Pseudocode:

```ts
function calculateArrangementPenalty(arrangement, previousTables) {
  let totalPenalty = 0;

  for (const table of arrangement) {
    totalPenalty += calculateCommunityPenalty(table.players);
    totalPenalty += calculateRepeatedMeetingPenalty(table.players, previousTables);
    totalPenalty += calculateTableSizePenalty(table.players.length);
  }

  return totalPenalty;
}
```

---

## 37. Table Size Penalty

Pseudocode:

```ts
function calculateTableSizePenalty(playerCount) {
  if (playerCount === 5) return 0;
  if (playerCount === 4) return 50;
  return 500;
}
```

---

## 38. Final Generator

File:

```text
src/lib/tournament/final.ts
```

Input:

```text
Top 10 standings
```

Pseudocode:

```ts
export function generateFinalTables(finalists) {
  return [
    {
      tableNumber: 1,
      tableName: "Final A",
      players: [
        finalists[0],
        finalists[3],
        finalists[4],
        finalists[7],
        finalists[8],
      ],
    },
    {
      tableNumber: 2,
      tableName: "Final B",
      players: [
        finalists[1],
        finalists[2],
        finalists[5],
        finalists[6],
        finalists[9],
      ],
    },
  ];
}
```

---

## 39. Database View untuk Klasemen

Untuk MVP, klasemen bisa dihitung di backend/app.

Jika ingin lebih rapi, buat SQL view.

Contoh konsep:

```sql
select
  participant_id,
  sum(tournament_point) as total_point,
  sum(score) as total_score,
  count(*) filter (where table_rank = 1) as first_place_count,
  count(*) filter (where table_rank = 2) as second_place_count,
  count(*) filter (where table_rank = 3) as third_place_count
from table_players
where tournament_point is not null
group by participant_id
order by
  total_point asc,
  total_score desc,
  first_place_count desc,
  second_place_count desc,
  third_place_count desc;
```

---

## 40. Halaman yang Dibutuhkan untuk MVP

### 40.1 Halaman Turnamen

URL:

```text
/tournaments/[tournamentId]
```

Isi:

```text
Ringkasan turnamen
Jumlah peserta
Status babak
Tombol kelola peserta
Tombol generate babak
Tombol klasemen
Tombol final
```

### 40.2 Halaman Peserta

URL:

```text
/tournaments/[tournamentId]/participants
```

Fitur:

```text
Tambah peserta
Edit peserta
Hapus peserta
Import CSV
Filter komunitas
```

### 40.3 Halaman Komunitas

URL:

```text
/tournaments/[tournamentId]/communities
```

Fitur:

```text
Tambah komunitas
Edit komunitas
Gabungkan komunitas duplikat
```

Fitur gabungkan komunitas berguna jika terlanjur ada data dobel.

Contoh:

```text
Gabungkan "sektor 1" ke "Sektor 1"
```

Efek:

```text
Semua peserta yang community_id lama dipindahkan ke community_id baru.
Community lama dihapus atau diarsipkan.
```

### 40.4 Halaman Babak

URL:

```text
/tournaments/[tournamentId]/rounds/[roundId]
```

Isi:

```text
Daftar meja
Status input
Tombol aktifkan babak
Tombol kunci babak
```

### 40.5 Halaman Input Meja

URL:

```text
/tables/[tableId]/score
```

Isi:

```text
Nama babak
Nomor meja
Daftar peserta
Input skor
Simpan draft
Kirim hasil
```

### 40.6 Halaman Klasemen

URL:

```text
/tournaments/[tournamentId]/standings
```

Isi:

```text
Klasemen penyisihan
Highlight 10 besar
Export
```

### 40.7 Halaman Final

URL:

```text
/tournaments/[tournamentId]/final
```

Isi:

```text
Daftar finalis
Meja final
Input hasil final
Hasil juara
```

### 40.8 Halaman Viewer

URL:

```text
/tournaments/[tournamentId]/viewer
```

Isi:

```text
Tampilan besar untuk proyektor
Tanpa tombol edit
```

---

## 41. Desain UI untuk Bapak-Bapak

Prinsip desain:

```text
Font besar.
Tombol besar.
Kontras jelas.
Jangan terlalu banyak menu.
Gunakan bahasa Indonesia sederhana.
Hindari istilah teknis.
```

Gunakan label seperti:

```text
Simpan
Kirim Hasil
Lihat Klasemen
Buat Babak Berikutnya
Kunci Babak
Cetak Hasil
```

Hindari label seperti:

```text
Submit Payload
Generate Entity
Sync State
Finalize Transaction
```

---

## 42. Validasi Penting

### 42.1 Sebelum Generate Babak 1

Validasi:

```text
Jumlah peserta minimal 10.
Semua peserta aktif punya nomor peserta.
Tidak ada nomor peserta dobel.
```

### 42.2 Sebelum Generate Babak Berikutnya

Validasi:

```text
Babak sebelumnya sudah dikunci.
Semua meja babak sebelumnya sudah submit.
Jumlah peserta aktif tidak berubah secara tidak sah.
```

### 42.3 Sebelum Kunci Babak

Validasi:

```text
Semua meja sudah submit.
Semua peserta di babak tersebut punya skor.
Semua peserta punya ranking meja.
Semua peserta punya poin turnamen.
Tidak ada skor sama yang belum diputuskan manual.
```

### 42.4 Sebelum Generate Final

Validasi:

```text
Babak 1 sampai 4 sudah locked.
Jumlah peserta aktif cukup.
Tidak ada tie yang belum diselesaikan untuk slot final.
```

---

## 43. Catatan Audit dan Koreksi

Sebaiknya semua perubahan penting dicatat.

Tabel: `audit_logs`

```sql
id uuid primary key
tournament_id uuid not null
user_id uuid null
action text not null
description text null
metadata jsonb null
created_at timestamp
```

Contoh action:

```text
CREATE_PARTICIPANT
UPDATE_SCORE
LOCK_ROUND
UNLOCK_ROUND
GENERATE_ROUND
MANUAL_ADJUST_TABLE
GENERATE_FINAL
```

Contoh description:

```text
Admin mengubah skor Pak A dari 300 menjadi 350 pada Babak 2 Meja 4.
```

Untuk MVP, audit log boleh dibuat belakangan. Tapi kalau waktu cukup, ini bagus.

---

## 44. Strategi Backup Saat Hari H

Karena acara offline bisa ada kendala internet, tetap siapkan backup manual.

Rekomendasi:

```text
1 laptop admin utama.
1 koneksi internet utama.
1 hotspot cadangan.
Kertas panpel tetap dipakai di setiap meja.
Setiap selesai babak, hasil diinput ke sistem.
Export klasemen tiap selesai babak.
```

Jangan mewajibkan input skor per kocok secara real-time.

Sistem cukup input:

```text
Total skor akhir per peserta per babak.
```

---

## 45. MVP Development Scope

### 45.1 Wajib Ada

```text
1. CRUD turnamen.
2. CRUD komunitas/sektor.
3. CRUD peserta.
4. Import peserta CSV.
5. Generate meja babak 1.
6. Generate rotasi babak 2-4.
7. Manual edit meja.
8. Input skor akhir per meja.
9. Auto ranking meja.
10. Auto poin turnamen.
11. Kunci babak.
12. Klasemen penyisihan.
13. Generate 10 finalis.
14. Generate 2 meja final.
15. Input hasil final.
16. Hasil juara final.
17. Export Excel klasemen dan hasil.
```

### 45.2 Bisa Ditunda

```text
1. Login multi-role kompleks.
2. QR code meja.
3. Realtime leaderboard.
4. Timer babak.
5. Upload foto peserta.
6. Riwayat banyak turnamen.
7. PDF cantik.
8. PWA offline penuh.
```

---

## 46. Acceptance Criteria

Sistem dianggap siap dipakai jika memenuhi kondisi berikut:

```text
1. Admin bisa input 50 peserta.
2. Admin bisa membuat master komunitas dan memilih komunitas saat input peserta.
3. Sistem menolak komunitas duplikat akibat beda huruf besar/kecil.
4. Admin bisa generate 10 meja untuk babak 1.
5. Sistem bisa generate babak 2-4 dengan rotasi.
6. Rotasi mengurangi peserta bertemu orang yang sama.
7. Rotasi mengurangi komunitas yang sama menumpuk di meja.
8. Admin tetap bisa edit meja secara manual.
9. Panpel bisa input skor akhir meja.
10. Sistem otomatis menentukan ranking dan poin.
11. Sistem bisa menghitung klasemen berdasarkan total poin terkecil.
12. Sistem bisa memakai total skor sebagai tie-breaker.
13. Sistem bisa mengambil 10 finalis.
14. Sistem bisa membuat 2 meja final.
15. Sistem bisa menentukan juara final.
16. Sistem bisa export hasil.
```

---

## 47. Contoh Data Peserta

```csv
No,Nama,Komunitas,No HP
1,Pak Andri,Sektor 1,
2,Pak Edo,Sektor 2,
3,Pak Jone,Sektor 1,
4,Pak Yeshy,Sektor 3,
5,Pak Rasendira,Sektor 4,
6,Pak Budi,Sektor 2,
7,Pak Agus,Sektor 5,
8,Pak Daniel,Sektor 6,
9,Pak Hendra,Sektor 7,
10,Pak Johan,Sektor 8,
```

---

## 48. Contoh Hasil Meja

Input:

```text
Babak 1 - Meja 1

Pak Andri: 300
Pak Edo: 605
Pak Jone: -290
Pak Yeshy: 90
Pak Rasendira: 480
```

Output sistem:

```text
Ranking 1: Pak Edo - skor 605 - poin 1
Ranking 2: Pak Rasendira - skor 480 - poin 2
Ranking 3: Pak Andri - skor 300 - poin 3
Ranking 4: Pak Yeshy - skor 90 - poin 4
Ranking 5: Pak Jone - skor -290 - poin 5
```

---

## 49. Catatan Penting untuk Developer AI

Jangan membuat sistem terlalu kompleks.

Fokus utama:

```text
Input peserta
Master komunitas
Generate meja
Input skor
Hitung ranking
Hitung klasemen
Generate final
```

Jangan membuat fitur seperti:

```text
Chat
Notifikasi WhatsApp
Live scoring per kartu
Mobile app native
Role permission terlalu rumit
Animasi berlebihan
```

Sistem ini harus ringan, jelas, dan bisa dipakai panitia yang tidak terlalu teknis.

---

## 50. Prioritas Pengerjaan

Urutan pengerjaan yang disarankan:

```text
1. Setup project Next.js + Supabase.
2. Buat tabel database.
3. Buat halaman turnamen.
4. Buat master komunitas.
5. Buat input/import peserta.
6. Buat generate babak 1.
7. Buat halaman input skor meja.
8. Buat perhitungan ranking dan poin.
9. Buat klasemen.
10. Buat generate rotasi babak 2-4.
11. Buat manual edit meja.
12. Buat generate finalis.
13. Buat meja final.
14. Buat hasil juara.
15. Buat export Excel.
16. Polishing UI untuk hari H.
```

---

## 51. Ringkasan Rule Utama

```text
Penyisihan:
- 50 peserta.
- 10 meja.
- 4 babak.
- 1 meja 5 peserta.
- Setiap babak input total skor akhir.
- Skor tertinggi di meja menjadi ranking 1.
- Ranking 1 = 1 poin, ranking 5 = 5 poin.
- Total poin terkecil masuk peringkat atas.
- Total skor menjadi tie-breaker.

Rotasi:
- Hindari peserta bertemu lawan yang sama.
- Hindari komunitas/sektor yang sama menumpuk.
- Komunitas harus dari master data, bukan input bebas.
- Admin boleh override manual.

Final:
- Ambil 10 peserta terbaik.
- Bagi menjadi 2 meja final.
- Juara akhir ditentukan dari ranking final dan skor final.
```
