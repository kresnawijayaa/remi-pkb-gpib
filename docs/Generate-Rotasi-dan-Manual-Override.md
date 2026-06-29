# Detail Generate Rotasi dan Manual Override

## 1. Tujuan Generate Rotasi

Generate rotasi digunakan untuk membuat pembagian meja pada Babak 2, Babak 3, dan Babak 4.

Tujuan utama rotasi:

```text
1. Peserta sebisa mungkin tidak bertemu lawan yang sama.
2. Peserta sebisa mungkin tidak langsung bertemu lawan dari babak sebelumnya.
3. Peserta dari komunitas/sektor yang sama sebisa mungkin tidak menumpuk di meja yang sama.
4. Jumlah peserta per meja tetap seimbang.
5. Admin tetap bisa mengubah hasil rotasi secara manual sebelum babak diaktifkan.
```

Sistem tidak wajib menghasilkan pembagian sempurna. Sistem hanya perlu menghasilkan pembagian terbaik berdasarkan penalty score.

---

## 2. Prinsip Penting

Rotasi harus bersifat:

```text
Generate Draft -> Review Admin -> Koreksi Manual Jika Perlu -> Aktifkan Babak
```

Jangan langsung membuat babak menjadi aktif setelah generate.

Flow yang benar:

```text
1. Admin klik "Generate Babak 2".
2. Sistem membuat draft pembagian meja.
3. Sistem menampilkan nilai kualitas rotasi.
4. Admin mengecek susunan meja.
5. Jika ada yang kurang pas, admin bisa pindahkan peserta manual.
6. Admin klik "Aktifkan Babak".
7. Baru setelah aktif, panpel dan peserta bisa melihat pembagian meja.
```

---

## 3. Data yang Dibutuhkan untuk Rotasi

Untuk generate rotasi, sistem membutuhkan data:

```text
1. Daftar peserta aktif.
2. Data komunitas/sektor setiap peserta.
3. Riwayat meja dari babak sebelumnya.
4. Jumlah meja.
5. Jumlah maksimal peserta per meja.
6. Nomor babak yang sedang dibuat.
```

Contoh peserta:

```json
[
  {
    "id": "p1",
    "name": "Pak Andri",
    "communityId": "sektor-1"
  },
  {
    "id": "p2",
    "name": "Pak Edo",
    "communityId": "sektor-2"
  }
]
```

Contoh riwayat meja:

```json
[
  {
    "roundNumber": 1,
    "tableNumber": 1,
    "players": ["p1", "p2", "p3", "p4", "p5"]
  },
  {
    "roundNumber": 1,
    "tableNumber": 2,
    "players": ["p6", "p7", "p8", "p9", "p10"]
  }
]
```

---

## 4. Pendekatan Algoritma yang Disarankan

Gunakan pendekatan:

```text
Random Shuffle + Split Table + Hitung Penalty + Ambil Hasil Terbaik
```

Artinya sistem mencoba banyak susunan acak, menghitung penalty setiap susunan, lalu menyimpan susunan dengan penalty paling kecil.

Untuk MVP, ini lebih aman daripada membuat algoritma kompleks.

Contoh:

```text
Coba generate 3.000 sampai 10.000 susunan.
Hitung penalty masing-masing susunan.
Ambil susunan dengan penalty terkecil.
```

Rekomendasi:

```text
Default attemptCount: 5.000
Jika peserta <= 60: boleh 10.000
Jika proses terlalu lambat: turunkan ke 3.000
```

---

## 5. Struktur Output Generate Rotasi

Output generate rotasi harus berisi:

```text
1. Daftar meja.
2. Daftar peserta di setiap meja.
3. Total penalty.
4. Detail warning.
5. Summary kualitas rotasi.
```

Contoh output:

```json
{
  "tables": [
    {
      "tableNumber": 1,
      "players": ["p1", "p7", "p13", "p24", "p31"]
    },
    {
      "tableNumber": 2,
      "players": ["p2", "p8", "p14", "p25", "p32"]
    }
  ],
  "totalPenalty": 300,
  "warnings": [
    {
      "type": "SAME_COMMUNITY",
      "tableNumber": 1,
      "message": "Meja 1 memiliki 2 peserta dari Sektor 1."
    },
    {
      "type": "REPEATED_MEETING",
      "tableNumber": 2,
      "message": "Pak Edo dan Pak Budi pernah bertemu di Babak 1."
    }
  ],
  "quality": "GOOD"
}
```

---

## 6. Sistem Penalty

Penalty adalah angka hukuman. Semakin kecil penalty, semakin bagus susunan meja.

### 6.1 Penalty Pertemuan Ulang

Aturan:

```text
Jika 2 peserta bertemu di babak tepat sebelumnya:
+1000

Jika 2 peserta pernah bertemu di babak lain:
+500 per pertemuan

Jika 2 peserta belum pernah bertemu:
+0
```

Contoh:

```text
Pak A dan Pak B satu meja di Babak 1.
Saat generate Babak 2, mereka satu meja lagi.
Penalty +1000.
```

Contoh lain:

```text
Pak A dan Pak B pernah satu meja di Babak 1.
Saat generate Babak 3, mereka satu meja lagi.
Penalty +500.
```

Kenapa babak tepat sebelumnya lebih berat?

Karena secara pengalaman peserta, bertemu orang yang sama dua babak berturut-turut terasa paling tidak adil.

---

### 6.2 Penalty Komunitas/Sektor Sama

Aturan:

```text
Jika dalam satu meja ada 1 peserta dari komunitas tertentu:
+0

Jika dalam satu meja ada 2 peserta dari komunitas yang sama:
+100

Jika dalam satu meja ada 3 peserta dari komunitas yang sama:
+400

Jika dalam satu meja ada 4 peserta dari komunitas yang sama:
+800

Jika dalam satu meja ada 5 peserta dari komunitas yang sama:
+1500
```

Contoh:

```text
Meja 1:
Pak A - Sektor 1
Pak B - Sektor 1
Pak C - Sektor 2
Pak D - Sektor 3
Pak E - Sektor 4

Penalty komunitas = +100
```

Contoh lebih buruk:

```text
Meja 2:
Pak F - Sektor 1
Pak G - Sektor 1
Pak H - Sektor 1
Pak I - Sektor 2
Pak J - Sektor 3

Penalty komunitas = +400
```

Catatan:

```text
Peserta tanpa communityId/null tidak dihitung sebagai komunitas yang sama.
```

---

### 6.3 Penalty Ukuran Meja

Untuk 50 peserta, target ideal:

```text
10 meja x 5 peserta
```

Penalty:

```text
Meja isi 5 peserta:
+0

Meja isi 4 peserta:
+50

Meja isi 6 peserta:
+500

Meja isi kurang dari 4:
+1000

Meja isi lebih dari 6:
+1000
```

Untuk turnamen ini, karena rencana 50 peserta, sebaiknya semua meja berisi 5 orang.

---

### 6.4 Penalty Tambahan Opsional

Penalty tambahan boleh dibuat nanti, tidak wajib MVP.

Contoh:

```text
Jika peserta duduk di meja nomor yang sama dengan babak sebelumnya:
+100

Jika peserta selalu dapat meja kecil/besar:
+20
```

Untuk MVP, penalty ini tidak wajib.

---

## 7. Quality Label

Setelah generate, tampilkan kualitas rotasi supaya admin mudah membaca.

Aturan:

```text
Penalty 0:
EXCELLENT

Penalty 1 - 500:
GOOD

Penalty 501 - 1500:
FAIR

Penalty > 1500:
NEED_REVIEW
```

Tampilan ke admin:

```text
Kualitas Rotasi: GOOD
Total Peringatan: 2
```

Contoh warning:

```text
- Meja 3 memiliki 2 peserta dari Sektor 1.
- Pak Andri dan Pak Edo pernah bertemu di Babak 1.
```

---

## 8. Fungsi Utama Generate Rotasi

Pseudocode TypeScript:

```ts
type Participant = {
  id: string;
  name: string;
  communityId: string | null;
};

type PreviousTable = {
  roundNumber: number;
  tableNumber: number;
  players: Participant[];
};

type GeneratedTable = {
  tableNumber: number;
  players: Participant[];
};

type GenerateRotationInput = {
  participants: Participant[];
  previousTables: PreviousTable[];
  tableCount: number;
  playersPerTable: number;
  currentRoundNumber: number;
  attemptCount?: number;
};

type GenerateRotationResult = {
  tables: GeneratedTable[];
  totalPenalty: number;
  warnings: RotationWarning[];
  quality: "EXCELLENT" | "GOOD" | "FAIR" | "NEED_REVIEW";
};

export function generateRotation(input: GenerateRotationInput): GenerateRotationResult {
  const {
    participants,
    previousTables,
    tableCount,
    playersPerTable,
    currentRoundNumber,
    attemptCount = 5000,
  } = input;

  let bestTables: GeneratedTable[] = [];
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestWarnings: RotationWarning[] = [];

  for (let i = 0; i < attemptCount; i++) {
    const shuffled = shuffleArray(participants);
    const tables = splitIntoTables(shuffled, tableCount, playersPerTable);

    const { penalty, warnings } = calculateRotationPenalty({
      tables,
      previousTables,
      currentRoundNumber,
    });

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestTables = tables;
      bestWarnings = warnings;
    }

    if (penalty === 0) {
      break;
    }
  }

  return {
    tables: bestTables,
    totalPenalty: bestPenalty,
    warnings: bestWarnings,
    quality: getRotationQuality(bestPenalty),
  };
}
```

---

## 9. Shuffle Array

Gunakan Fisher-Yates shuffle.

```ts
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}
```

---

## 10. Split Into Tables

Untuk 50 peserta, 10 meja, 5 peserta per meja:

```ts
export function splitIntoTables(
  participants: Participant[],
  tableCount: number,
  playersPerTable: number
): GeneratedTable[] {
  const tables: GeneratedTable[] = [];

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
Dengan cara index % tableCount, peserta akan tersebar rata.
Untuk 50 peserta dan 10 meja, tiap meja otomatis 5 peserta.
```

---

## 11. Hitung Penalty Total

```ts
type RotationWarning = {
  type:
    | "REPEATED_MEETING_PREVIOUS_ROUND"
    | "REPEATED_MEETING_ANY_ROUND"
    | "SAME_COMMUNITY"
    | "TABLE_SIZE";
  tableNumber: number;
  message: string;
  participantIds?: string[];
  communityId?: string;
};

export function calculateRotationPenalty({
  tables,
  previousTables,
  currentRoundNumber,
}: {
  tables: GeneratedTable[];
  previousTables: PreviousTable[];
  currentRoundNumber: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

  for (const table of tables) {
    const communityResult = calculateCommunityPenalty(table);
    penalty += communityResult.penalty;
    warnings.push(...communityResult.warnings);

    const meetingResult = calculateRepeatedMeetingPenalty({
      table,
      previousTables,
      currentRoundNumber,
    });
    penalty += meetingResult.penalty;
    warnings.push(...meetingResult.warnings);

    const sizeResult = calculateTableSizePenalty(table);
    penalty += sizeResult.penalty;
    warnings.push(...sizeResult.warnings);
  }

  return {
    penalty,
    warnings,
  };
}
```

---

## 12. Hitung Penalty Komunitas

```ts
export function calculateCommunityPenalty(table: GeneratedTable) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

  const communityMap = new Map<string, Participant[]>();

  for (const player of table.players) {
    if (!player.communityId) continue;

    const list = communityMap.get(player.communityId) ?? [];
    list.push(player);
    communityMap.set(player.communityId, list);
  }

  for (const [communityId, players] of communityMap.entries()) {
    const count = players.length;

    if (count <= 1) continue;

    if (count === 2) penalty += 100;
    if (count === 3) penalty += 400;
    if (count === 4) penalty += 800;
    if (count >= 5) penalty += 1500;

    warnings.push({
      type: "SAME_COMMUNITY",
      tableNumber: table.tableNumber,
      communityId,
      participantIds: players.map((p) => p.id),
      message: `Meja ${table.tableNumber} memiliki ${count} peserta dari komunitas/sektor yang sama.`,
    });
  }

  return {
    penalty,
    warnings,
  };
}
```

---

## 13. Hitung Penalty Pertemuan Ulang

### 13.1 Buat Pair Key

Supaya gampang cek pasangan peserta, buat pair key.

```ts
export function createPairKey(participantIdA: string, participantIdB: string): string {
  return [participantIdA, participantIdB].sort().join("__");
}
```

Contoh:

```text
createPairKey("p2", "p1") => "p1__p2"
createPairKey("p1", "p2") => "p1__p2"
```

Jadi urutan tidak berpengaruh.

---

### 13.2 Buat Meeting Map

Meeting map berisi riwayat pasangan peserta yang pernah satu meja.

```ts
type MeetingInfo = {
  count: number;
  rounds: number[];
};

export function buildMeetingMap(previousTables: PreviousTable[]) {
  const meetingMap = new Map<string, MeetingInfo>();

  for (const table of previousTables) {
    const players = table.players;

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const key = createPairKey(players[i].id, players[j].id);

        const existing = meetingMap.get(key) ?? {
          count: 0,
          rounds: [],
        };

        existing.count += 1;
        existing.rounds.push(table.roundNumber);

        meetingMap.set(key, existing);
      }
    }
  }

  return meetingMap;
}
```

---

### 13.3 Calculate Repeated Meeting Penalty

```ts
export function calculateRepeatedMeetingPenalty({
  table,
  previousTables,
  currentRoundNumber,
}: {
  table: GeneratedTable;
  previousTables: PreviousTable[];
  currentRoundNumber: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

  const meetingMap = buildMeetingMap(previousTables);
  const players = table.players;
  const previousRoundNumber = currentRoundNumber - 1;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const playerA = players[i];
      const playerB = players[j];

      const pairKey = createPairKey(playerA.id, playerB.id);
      const meetingInfo = meetingMap.get(pairKey);

      if (!meetingInfo) continue;

      const metInPreviousRound = meetingInfo.rounds.includes(previousRoundNumber);

      if (metInPreviousRound) {
        penalty += 1000;

        warnings.push({
          type: "REPEATED_MEETING_PREVIOUS_ROUND",
          tableNumber: table.tableNumber,
          participantIds: [playerA.id, playerB.id],
          message: `${playerA.name} dan ${playerB.name} sudah bertemu di babak sebelumnya.`,
        });
      } else {
        penalty += 500 * meetingInfo.count;

        warnings.push({
          type: "REPEATED_MEETING_ANY_ROUND",
          tableNumber: table.tableNumber,
          participantIds: [playerA.id, playerB.id],
          message: `${playerA.name} dan ${playerB.name} pernah bertemu ${meetingInfo.count} kali sebelumnya.`,
        });
      }
    }
  }

  return {
    penalty,
    warnings,
  };
}
```

Catatan development:

```text
Untuk performa lebih baik, meetingMap sebaiknya dibuat sekali sebelum loop attempt,
bukan dibuat ulang di setiap table.
```

Versi optimized:

```text
1. buildMeetingMap(previousTables) dibuat sebelum loop attempt.
2. meetingMap dikirim ke calculateRepeatedMeetingPenalty.
```

---

## 14. Hitung Penalty Ukuran Meja

```ts
export function calculateTableSizePenalty(table: GeneratedTable) {
  const count = table.players.length;

  if (count === 5) {
    return {
      penalty: 0,
      warnings: [],
    };
  }

  let penalty = 0;

  if (count === 4) penalty = 50;
  else penalty = 1000;

  return {
    penalty,
    warnings: [
      {
        type: "TABLE_SIZE",
        tableNumber: table.tableNumber,
        message: `Meja ${table.tableNumber} berisi ${count} peserta.`,
      },
    ],
  };
}
```

---

## 15. Quality Label Function

```ts
export function getRotationQuality(penalty: number) {
  if (penalty === 0) return "EXCELLENT";
  if (penalty <= 500) return "GOOD";
  if (penalty <= 1500) return "FAIR";
  return "NEED_REVIEW";
}
```

Teks tampilan:

```text
EXCELLENT = Rotasi sangat baik
GOOD = Rotasi baik
FAIR = Rotasi cukup, perlu dicek panitia
NEED_REVIEW = Rotasi perlu diperiksa dan mungkin dikoreksi manual
```

---

## 16. Optimasi agar Generate Lebih Bagus

Agar hasil generate lebih bagus, lakukan beberapa strategi berikut.

### 16.1 Sort Peserta Berdasarkan Komunitas Terbesar

Sebelum shuffle, sistem bisa mendata komunitas yang pesertanya paling banyak.

Tujuannya agar penalty komunitas lebih mudah dikontrol.

Namun untuk MVP, ini tidak wajib.

### 16.2 Multiple Strategy

Selain full random, coba beberapa strategi:

```text
Strategy 1: Full random.
Strategy 2: Urut komunitas besar dulu, lalu sebar round-robin.
Strategy 3: Berdasarkan klasemen sementara, lalu disebar.
```

Untuk MVP, cukup Strategy 1.

### 16.3 Admin Bisa Klik Generate Ulang

Setelah hasil muncul, beri tombol:

```text
Generate Ulang
```

Jika admin merasa susunan kurang pas, admin bisa generate ulang sebelum aktifkan babak.

---

## 17. UI Review Rotasi

Setelah generate, tampilkan halaman review.

Contoh:

```text
Babak 2 - Draft Pembagian Meja

Kualitas Rotasi: GOOD
Total Penalty: 300
Peringatan: 2

[Generate Ulang]
[Simpan Draft]
[Aktifkan Babak]
```

Setiap meja ditampilkan sebagai card:

```text
Meja 1
1. Pak Andri - Sektor 1
2. Pak Edo - Sektor 2
3. Pak Jone - Sektor 3
4. Pak Daniel - Sektor 4
5. Pak Agus - Sektor 1

Peringatan:
- Ada 2 peserta dari Sektor 1.
```

Jika ada repeated meeting:

```text
Meja 2
1. Pak Budi - Sektor 2
2. Pak Hendra - Sektor 5
3. Pak Johan - Sektor 6
4. Pak Markus - Sektor 7
5. Pak Samuel - Sektor 8

Peringatan:
- Pak Budi dan Pak Hendra pernah bertemu di Babak 1.
```

---

## 18. Manual Override Pembagian Meja

Admin harus bisa memperbaiki pembagian meja secara manual.

Fitur minimal:

```text
1. Pilih peserta.
2. Pilih meja tujuan.
3. Sistem memindahkan peserta.
4. Sistem menghitung ulang warning dan penalty.
5. Sistem menampilkan apakah hasil menjadi lebih baik atau lebih buruk.
```

Lebih baik lagi jika ada fitur swap:

```text
1. Pilih peserta A.
2. Pilih peserta B.
3. Klik Tukar Peserta.
4. Sistem menukar posisi mereka.
5. Sistem hitung ulang penalty.
```

Untuk MVP, fitur swap lebih aman daripada drag and drop.

---

## 19. Manual Override dengan Swap Peserta

Rekomendasi MVP:

```text
Gunakan swap peserta antar meja, bukan drag and drop.
```

Alasan:

```text
1. Lebih mudah dibuat.
2. Jumlah peserta per meja tetap stabil.
3. Tidak mudah terjadi meja isi 4 atau 6.
4. Cocok untuk 50 peserta / 10 meja.
```

Contoh UI:

```text
Koreksi Manual

Peserta 1:
[Pak Andri - Meja 1]

Peserta 2:
[Pak Budi - Meja 4]

[Tukar Peserta]
```

Setelah klik:

```text
Pak Andri pindah ke Meja 4.
Pak Budi pindah ke Meja 1.
Penalty lama: 600
Penalty baru: 200
Hasil: Lebih baik
```

Jika penalty memburuk:

```text
Penalty lama: 200
Penalty baru: 800
Hasil: Lebih buruk

Tetap simpan perubahan?
[Ya, Simpan]
[Batal]
```

---

## 20. Manual Override dengan Move Peserta

Move peserta boleh ditambahkan, tetapi harus menjaga jumlah meja.

Jika admin memindahkan Pak A dari Meja 1 ke Meja 2:

```text
Meja 1 menjadi 4 peserta.
Meja 2 menjadi 6 peserta.
```

Ini tidak ideal.

Maka sistem harus memberi warning:

```text
Meja 1 hanya berisi 4 peserta.
Meja 2 berisi 6 peserta.
Sebaiknya gunakan fitur Tukar Peserta agar jumlah tetap seimbang.
```

Untuk MVP, fitur move boleh tidak dibuat dulu. Cukup swap.

---

## 21. Manual Override Field yang Harus Disimpan

Saat admin melakukan koreksi manual, simpan log.

Tabel: `rotation_manual_adjustments`

```sql
id uuid primary key
tournament_id uuid not null
round_id uuid not null
adjustment_type text not null
participant_id_1 uuid not null
participant_id_2 uuid null
from_table_id uuid null
to_table_id uuid null
old_penalty integer null
new_penalty integer null
note text null
created_by uuid null
created_at timestamp not null default now()
```

`adjustment_type`:

```text
SWAP
MOVE
```

Untuk MVP, cukup support:

```text
SWAP
```

Contoh log:

```text
Admin menukar Pak Andri dari Meja 1 dengan Pak Budi dari Meja 4.
Penalty berubah dari 600 menjadi 200.
```

---

## 22. Admin Override untuk Semua Step Penting

Admin harus bisa koreksi manual bukan hanya di rotasi, tetapi juga di beberapa titik penting.

### 22.1 Koreksi Peserta

Admin bisa:

```text
Tambah peserta
Edit nama peserta
Ganti komunitas peserta
Nonaktifkan peserta
Ubah nomor peserta
```

Validasi:

```text
Jika babak sudah berjalan, perubahan peserta harus diberi warning.
```

Contoh:

```text
Turnamen sudah aktif. Mengubah peserta dapat memengaruhi pembagian meja.
Lanjutkan?
```

---

### 22.2 Koreksi Komunitas

Admin bisa:

```text
Tambah komunitas
Edit nama komunitas
Gabungkan komunitas duplikat
```

Contoh fitur gabung:

```text
Gabungkan komunitas:
Dari: sektor 1
Ke: Sektor 1
```

Efek:

```text
Semua peserta dari komunitas lama dipindahkan ke komunitas tujuan.
Komunitas lama diarsipkan/dihapus.
```

---

### 22.3 Koreksi Meja Draft

Sebelum babak aktif, admin bisa:

```text
Generate ulang
Swap peserta antar meja
Edit nomor meja
Simpan draft
Aktifkan babak
```

Ini adalah koreksi paling penting untuk rotasi.

---

### 22.4 Koreksi Meja Aktif

Jika babak sudah aktif tetapi belum ada skor masuk, admin masih boleh koreksi meja.

Sistem beri warning:

```text
Babak sudah aktif. Jika pembagian meja sudah diumumkan, perubahan dapat membingungkan peserta.
Lanjutkan?
```

Jika sudah ada skor masuk, jangan izinkan koreksi meja kecuali admin membuka mode khusus.

---

### 22.5 Koreksi Skor Meja

Sebelum babak dikunci, admin bisa:

```text
Edit skor peserta
Ubah ranking manual jika skor sama
Reset hasil meja
Kembalikan status meja dari submitted ke draft
```

Setiap perubahan skor harus menghitung ulang:

```text
Ranking meja
Poin turnamen
Klasemen sementara
```

---

### 22.6 Koreksi Setelah Babak Dikunci

Jika babak sudah dikunci, hasil tidak boleh diedit biasa.

Admin perlu tombol:

```text
Buka Kunci Babak
```

Setelah dibuka:

```text
Status babak kembali ke active.
Admin bisa koreksi skor.
Admin harus kunci ulang babak.
Klasemen dihitung ulang.
```

Sistem wajib menampilkan warning:

```text
Babak sudah dikunci. Membuka kunci dapat mengubah klasemen dan finalis.
Lanjutkan?
```

---

### 22.7 Koreksi Finalis

Setelah generate finalis, admin bisa melihat daftar finalis.

Jika ada tie yang tidak bisa diputus otomatis, sistem wajib meminta keputusan manual.

Contoh:

```text
Pak A dan Pak B memiliki nilai tie untuk slot final terakhir.
Silakan pilih peserta yang masuk final.
```

Admin bisa:

```text
Pilih Pak A
Pilih Pak B
Tandai sebagai hasil tiebreak
```

Simpan catatan:

```text
Pak A masuk final berdasarkan tiebreak 1 kali kocok.
```

---

### 22.8 Koreksi Meja Final

Sebelum final aktif, admin bisa:

```text
Generate ulang meja final
Swap peserta meja final
Aktifkan final
```

Sebaiknya tetap pakai pembagian default:

```text
Final A: Rank 1, 4, 5, 8, 9
Final B: Rank 2, 3, 6, 7, 10
```

Tapi admin tetap bisa koreksi manual jika panitia punya pertimbangan lain.

---

### 22.9 Koreksi Hasil Final

Sebelum turnamen selesai, admin bisa:

```text
Edit skor final
Ubah ranking manual jika skor sama
Hitung ulang juara
```

Setelah turnamen selesai, harus ada warning jika ingin koreksi.

---

## 23. Status yang Disarankan

Agar koreksi manual aman, gunakan status.

### 23.1 Round Status

```text
draft
active
locked
```

Arti:

```text
draft:
Babak sudah dibuat, tapi belum diumumkan. Admin bebas koreksi meja.

active:
Babak sedang berjalan. Koreksi masih bisa, tapi diberi warning.

locked:
Babak selesai dan hasil dikunci. Koreksi harus melalui buka kunci.
```

### 23.2 Table Status

```text
draft
submitted
locked
```

Arti:

```text
draft:
Skor belum dikirim.

submitted:
Panpel sudah kirim hasil meja. Admin masih bisa review/edit sebelum babak locked.

locked:
Hasil meja terkunci karena babak sudah locked.
```

---

## 24. Validasi Manual Override

### 24.1 Saat Swap Peserta

Setelah swap, sistem harus menghitung ulang:

```text
1. Penalty total.
2. Warning per meja.
3. Ukuran meja.
4. Pertemuan ulang.
5. Komunitas yang menumpuk.
```

Tampilkan hasil:

```text
Penalty sebelum: 600
Penalty sesudah: 300
Status: Lebih baik
```

atau:

```text
Penalty sebelum: 300
Penalty sesudah: 900
Status: Lebih buruk
```

Admin tetap boleh menyimpan hasil yang lebih buruk, tetapi harus konfirmasi.

---

### 24.2 Saat Aktifkan Babak

Validasi:

```text
1. Semua peserta aktif sudah masuk tepat 1 meja.
2. Tidak ada peserta dobel.
3. Tidak ada meja kosong.
4. Jumlah peserta per meja sesuai target.
5. Jika ada warning berat, tampilkan konfirmasi.
```

Warning berat:

```text
1. Peserta bertemu lawan yang sama dari babak sebelumnya.
2. Ada 3 atau lebih peserta dari komunitas yang sama dalam 1 meja.
3. Ada meja dengan jumlah peserta tidak ideal.
```

Contoh konfirmasi:

```text
Masih ada 3 peringatan berat pada pembagian meja.
Apakah tetap ingin mengaktifkan babak?
[Ya, Aktifkan]
[Batal]
```

---

## 25. Audit Log untuk Koreksi Manual

Semua tindakan manual penting harus dicatat.

Tabel: `audit_logs`

```sql
id uuid primary key
tournament_id uuid not null
round_id uuid null
table_id uuid null
actor_id uuid null
action text not null
description text not null
metadata jsonb null
created_at timestamp not null default now()
```

Contoh action:

```text
GENERATE_ROUND
REGENERATE_ROUND
SWAP_PARTICIPANTS
ACTIVATE_ROUND
LOCK_ROUND
UNLOCK_ROUND
UPDATE_SCORE
MANUAL_RANKING
GENERATE_FINALISTS
MANUAL_FINALIST_OVERRIDE
```

Contoh metadata:

```json
{
  "oldPenalty": 600,
  "newPenalty": 300,
  "participantA": "Pak Andri",
  "participantB": "Pak Budi",
  "fromTableA": 1,
  "fromTableB": 4
}
```

---

## 26. Contoh Skenario Rotasi

### 26.1 Babak 1

Babak 1 dibuat random, tetapi tetap pakai community penalty.

Contoh:

```text
Generate Babak 1:
- Tidak ada repeated meeting karena belum ada riwayat.
- Penalty hanya dari komunitas dan ukuran meja.
```

### 26.2 Babak 2

Babak 2 memperhatikan Babak 1.

Prioritas:

```text
Jangan sampai peserta langsung bertemu lagi dengan orang dari Babak 1.
```

Jika tidak bisa sempurna, sistem pilih susunan dengan repeated meeting paling sedikit.

### 26.3 Babak 3

Babak 3 memperhatikan Babak 1 dan Babak 2.

Penalty paling berat tetap:

```text
Bertemu ulang dengan lawan dari Babak 2.
```

Bertemu ulang dengan lawan dari Babak 1 tetap dihitung, tapi lebih ringan.

### 26.4 Babak 4

Babak 4 memperhatikan seluruh riwayat.

Karena sudah 3 babak berjalan, kemungkinan repeated meeting bisa terjadi. Sistem cukup meminimalkan jumlahnya.

---

## 27. Contoh Sederhana Hitung Penalty

Misal Meja 1 Babak 2 berisi:

```text
Pak A - Sektor 1
Pak B - Sektor 1
Pak C - Sektor 2
Pak D - Sektor 3
Pak E - Sektor 4
```

Riwayat:

```text
Pak A dan Pak C pernah satu meja di Babak 1.
Pak D dan Pak E belum pernah bertemu.
```

Penalty:

```text
Pak A dan Pak B sama-sama Sektor 1:
+100

Pak A dan Pak C pernah bertemu di babak sebelumnya:
+1000

Total penalty Meja 1:
1100
```

Jika ada alternatif meja lain dengan penalty 300, sistem akan memilih alternatif tersebut.

---

## 28. Rekomendasi Implementasi MVP

Untuk MVP, implementasikan urutan ini:

```text
1. Generate random meja Babak 1 dengan community penalty.
2. Simpan hasil generate sebagai draft.
3. Buat fitur swap peserta antar meja.
4. Buat warning komunitas sama.
5. Buat warning repeated meeting.
6. Buat generate Babak 2-4 dengan penalty.
7. Buat tombol generate ulang.
8. Buat audit log sederhana.
```

Jangan langsung membuat:

```text
Drag and drop kompleks
Optimasi algoritma terlalu berat
AI-based scheduling
Visual graph peserta
```

---

## 29. Kesimpulan Rotasi

Rule utama:

```text
Generate otomatis hanya memberi rekomendasi terbaik.
Admin tetap menjadi pengambil keputusan akhir.
```

Kalimat yang bisa ditampilkan di sistem:

```text
Sistem sudah membuat pembagian meja terbaik berdasarkan data yang tersedia.
Jika masih ada susunan yang kurang sesuai, admin dapat menukar peserta secara manual sebelum babak diaktifkan.
```
