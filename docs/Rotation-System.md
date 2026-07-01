# Spesifikasi Detail Generate Rotasi Meja Turnamen Remi PKB

## 1. Tujuan Dokumen

Dokumen ini menjelaskan secara detail cara membuat sistem generate rotasi meja untuk turnamen Remi PKB.

Sistem turnamen menggunakan format:

```text
50 peserta
10 meja
5 peserta per meja
4 babak penyisihan
10 peserta terbaik masuk final
2 meja final
```

Fokus dokumen ini adalah bagian:

```text
Generate pembagian meja Babak 1 sampai Babak 4
```

Sistem rotasi harus membantu panitia agar:

```text
1. Peserta tidak bertemu orang yang sama berulang kali.
2. Peserta tidak langsung bertemu lawan yang sama dari babak sebelumnya.
3. Peserta dari komunitas/sektor yang sama tidak menumpuk di satu meja.
4. Pembagian meja tetap seimbang.
5. Admin tetap bisa koreksi manual jika hasil generate kurang pas.
```

---

# 2. Prinsip Utama Rotasi

Sistem jangan menggunakan full random murni.

Full random memiliki kelemahan:

```text
1. Bisa lama menemukan kombinasi yang bagus.
2. Hasil sulit diprediksi.
3. Bisa menghasilkan peserta yang bertemu orang yang sama.
4. Bisa menumpuk komunitas/sektor yang sama dalam satu meja.
5. Sulit dijelaskan ke panitia.
```

Gunakan pendekatan gabungan:

```text
Community Spreading
+ Pattern Rotation
+ Penalty Check
+ Local Swap Optimization
+ Manual Override Admin
```

Artinya:

```text
1. Peserta disusun dulu agar komunitas/sektor tersebar.
2. Sistem membuat pola rotasi berdasarkan rumus.
3. Sistem menghitung masalah/penalty dari hasil rotasi.
4. Sistem memperbaiki hasil dengan swap otomatis.
5. Admin tetap bisa koreksi manual sebelum babak aktif.
```

---

# 3. Istilah Penting

## 3.1 Peserta

Peserta adalah orang yang ikut turnamen.

Contoh:

```json
{
  "id": "p001",
  "name": "Pak Andri",
  "communityId": "sektor-1"
}
```

---

## 3.2 Komunitas/Sektor

Komunitas/sektor adalah asal peserta.

Contoh:

```text
Sektor 1
Sektor 2
Sektor 3
PKB Gabungan
Tamu
```

Komunitas harus berupa master data, bukan teks bebas.

Tujuannya agar sistem tidak salah membedakan:

```text
Sektor 1
sektor 1
SEKTOR 1
Sektor I
```

---

## 3.3 Meja

Meja adalah grup permainan dalam satu babak.

Contoh:

```json
{
  "tableNumber": 1,
  "players": ["p001", "p007", "p013", "p024", "p031"]
}
```

---

## 3.4 Babak

Babak adalah ronde penyisihan.

Turnamen ini memiliki 4 babak penyisihan:

```text
Babak 1
Babak 2
Babak 3
Babak 4
```

---

## 3.5 Seed Order

Seed order adalah urutan peserta yang sudah disusun oleh sistem.

Seed order dibuat sekali saat peserta dikunci.

Contoh:

```text
Seed 1  = Pak Andri
Seed 2  = Pak Edo
Seed 3  = Pak Budi
...
Seed 50 = Pak Samuel
```

Seed order ini menjadi dasar pola rotasi.

---

# 4. Flow Besar Generate Rotasi

Flow yang disarankan:

```text
1. Admin input peserta.
2. Admin input / pilih komunitas peserta.
3. Admin klik "Kunci Peserta & Buat Seed".
4. Sistem menyusun seed order dengan community spreading.
5. Sistem generate Babak 1 menggunakan pattern rotation.
6. Sistem generate Babak 2 menggunakan pattern rotation.
7. Sistem generate Babak 3 menggunakan pattern rotation.
8. Sistem generate Babak 4 menggunakan pattern rotation.
9. Sistem menghitung warning dan penalty.
10. Sistem melakukan local swap otomatis untuk mengurangi penalty.
11. Admin review hasil.
12. Admin boleh koreksi manual dengan swap peserta.
13. Admin aktifkan babak satu per satu saat acara berlangsung.
```

---

# 5. Kenapa Sebaiknya Seed Dibuat Sekali

Seed order sebaiknya dibuat satu kali, bukan berubah setiap generate ulang.

Alasan:

```text
1. Hasil rotasi lebih stabil.
2. Mudah dicek ulang.
3. Mudah dijelaskan ke panitia.
4. Tidak terlalu random.
5. Jika ada bug, lebih mudah debug.
```

Contoh:

```text
Peserta dikunci:
P01 sampai P50

Babak 1 sampai Babak 4 dibuat berdasarkan P01 sampai P50.
```

Jika admin klik generate ulang, sistem boleh mengulang local swap, tetapi seed utama sebaiknya tetap.

---

# 6. Struktur Data Minimal

## 6.1 Participant

```ts
type Participant = {
  id: string;
  name: string;
  communityId: string | null;
  seedOrder: number | null;
};
```

Contoh:

```json
{
  "id": "p001",
  "name": "Pak Andri",
  "communityId": "sektor-1",
  "seedOrder": 1
}
```

---

## 6.2 Community

```ts
type Community = {
  id: string;
  name: string;
  normalizedName: string;
};
```

Contoh:

```json
{
  "id": "sektor-1",
  "name": "Sektor 1",
  "normalizedName": "sektor 1"
}
```

---

## 6.3 GeneratedTable

```ts
type GeneratedTable = {
  tableNumber: number;
  players: Participant[];
};
```

Contoh:

```json
{
  "tableNumber": 1,
  "players": [
    {
      "id": "p001",
      "name": "Pak Andri",
      "communityId": "sektor-1",
      "seedOrder": 1
    },
    {
      "id": "p011",
      "name": "Pak Budi",
      "communityId": "sektor-2",
      "seedOrder": 11
    }
  ]
}
```

---

## 6.4 GeneratedRound

```ts
type GeneratedRound = {
  roundNumber: number;
  tables: GeneratedTable[];
  totalPenalty: number;
  warnings: RotationWarning[];
  quality: RotationQuality;
};
```

---

## 6.5 RotationWarning

```ts
type RotationWarning = {
  type:
    | "SAME_COMMUNITY"
    | "REPEATED_MEETING_PREVIOUS_ROUND"
    | "REPEATED_MEETING_ANY_ROUND"
    | "TABLE_SIZE";
  roundNumber: number;
  tableNumber: number;
  message: string;
  participantIds?: string[];
  communityId?: string;
};
```

---

## 6.6 RotationQuality

```ts
type RotationQuality =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "NEED_REVIEW";
```

---

# 7. Database Field yang Disarankan

## 7.1 participants

Tambahkan field:

```sql
seed_order integer null
```

Contoh:

```sql
alter table participants
add column seed_order integer null;
```

Constraint yang disarankan:

```sql
unique(tournament_id, seed_order)
```

---

## 7.2 rounds

Gunakan status:

```text
draft
active
locked
```

Makna:

```text
draft  = babak sudah dibuat, admin masih bisa koreksi meja
active = babak sedang berjalan
locked = hasil babak sudah dikunci
```

---

## 7.3 match_tables

Tabel meja per babak.

```sql
id uuid primary key
tournament_id uuid not null
round_id uuid not null
table_number integer not null
status text not null default 'draft'
```

---

## 7.4 table_players

Tabel peserta di meja.

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
```

---

# 8. Step 1 — Community Spreading

## 8.1 Tujuan

Community spreading bertujuan menyusun peserta agar komunitas/sektor tersebar sejak awal.

Contoh buruk:

```text
P01 Sektor 1
P02 Sektor 1
P03 Sektor 1
P04 Sektor 1
P05 Sektor 1
P06 Sektor 2
P07 Sektor 2
...
```

Contoh lebih baik:

```text
P01 Sektor 1
P02 Sektor 2
P03 Sektor 3
P04 Sektor 4
P05 Sektor 5
P06 Sektor 1
P07 Sektor 2
P08 Sektor 3
...
```

---

## 8.2 Cara Kerja

Langkah:

```text
1. Kelompokkan peserta berdasarkan communityId.
2. Urutkan grup komunitas dari jumlah peserta terbanyak.
3. Ambil 1 peserta dari setiap komunitas secara bergantian.
4. Ulangi sampai semua peserta masuk seed order.
```

---

## 8.3 Contoh Data

Input:

```text
Sektor 1: A1, A2, A3, A4
Sektor 2: B1, B2, B3
Sektor 3: C1, C2
Sektor 4: D1
```

Output community spreading:

```text
A1, B1, C1, D1, A2, B2, C2, A3, B3, A4
```

Hasilnya lebih tersebar daripada:

```text
A1, A2, A3, A4, B1, B2, B3, C1, C2, D1
```

---

## 8.4 TypeScript Function

```ts
type Participant = {
  id: string;
  name: string;
  communityId: string | null;
  seedOrder?: number | null;
};

export function spreadParticipantsByCommunity(
  participants: Participant[]
): Participant[] {
  const communityMap = new Map<string, Participant[]>();

  for (const participant of participants) {
    const key = participant.communityId ?? `unknown-${participant.id}`;

    const currentList = communityMap.get(key) ?? [];
    currentList.push(participant);
    communityMap.set(key, currentList);
  }

  let groups = [...communityMap.values()].sort((a, b) => b.length - a.length);

  const result: Participant[] = [];

  while (groups.some((group) => group.length > 0)) {
    for (const group of groups) {
      const participant = group.shift();

      if (participant) {
        result.push(participant);
      }
    }

    groups = groups.sort((a, b) => b.length - a.length);
  }

  return result.map((participant, index) => ({
    ...participant,
    seedOrder: index + 1,
  }));
}
```

---

## 8.5 Catatan Penting

Peserta tanpa komunitas jangan dianggap satu komunitas yang sama.

Jika `communityId` null, gunakan key unik:

```ts
const key = participant.communityId ?? `unknown-${participant.id}`;
```

Dengan begitu, peserta tanpa komunitas tidak akan dianggap menumpuk.

---

# 9. Step 2 — Pattern Rotation

## 9.1 Tujuan

Pattern rotation membuat pola meja berdasarkan seed order.

Kelebihan:

```text
1. Cepat.
2. Tidak perlu mencari random terlalu lama.
3. Hasil lebih stabil.
4. Peserta cenderung tidak bertemu orang yang sama.
5. Mudah dijelaskan dan diuji.
```

---

## 9.2 Konsep Matrix

Untuk 50 peserta:

```text
10 meja
5 peserta per meja
```

Buat 5 kolom, masing-masing 10 peserta:

```text
Kolom 0: P01 - P10
Kolom 1: P11 - P20
Kolom 2: P21 - P30
Kolom 3: P31 - P40
Kolom 4: P41 - P50
```

Setiap meja akan mengambil 1 peserta dari setiap kolom.

---

## 9.3 Rumus Dasar

```text
participantIndex = column * tableCount + ((tableIndex + column * roundOffset) % tableCount)
```

Keterangan:

```text
participantIndex = index peserta dalam seed order, dimulai dari 0
column = kolom peserta, 0 sampai 4
tableCount = jumlah meja, contoh 10
tableIndex = index meja, 0 sampai 9
roundOffset = angka geser berdasarkan babak
```

---

## 9.4 Offset Tiap Babak

Gunakan offset berikut:

```text
Babak 1: roundOffset = 0
Babak 2: roundOffset = 1
Babak 3: roundOffset = 2
Babak 4: roundOffset = 3
```

---

# 10. Contoh Pola 50 Peserta

Misalnya seed order:

```text
P01, P02, P03, ..., P50
```

---

## 10.1 Babak 1

Offset = 0

```text
Meja 1 : P01 P11 P21 P31 P41
Meja 2 : P02 P12 P22 P32 P42
Meja 3 : P03 P13 P23 P33 P43
Meja 4 : P04 P14 P24 P34 P44
Meja 5 : P05 P15 P25 P35 P45
Meja 6 : P06 P16 P26 P36 P46
Meja 7 : P07 P17 P27 P37 P47
Meja 8 : P08 P18 P28 P38 P48
Meja 9 : P09 P19 P29 P39 P49
Meja 10: P10 P20 P30 P40 P50
```

---

## 10.2 Babak 2

Offset = 1

```text
Meja 1 : P01 P12 P23 P34 P45
Meja 2 : P02 P13 P24 P35 P46
Meja 3 : P03 P14 P25 P36 P47
Meja 4 : P04 P15 P26 P37 P48
Meja 5 : P05 P16 P27 P38 P49
Meja 6 : P06 P17 P28 P39 P50
Meja 7 : P07 P18 P29 P40 P41
Meja 8 : P08 P19 P30 P31 P42
Meja 9 : P09 P20 P21 P32 P43
Meja 10: P10 P11 P22 P33 P44
```

---

## 10.3 Babak 3

Offset = 2

```text
Meja 1 : P01 P13 P25 P37 P49
Meja 2 : P02 P14 P26 P38 P50
Meja 3 : P03 P15 P27 P39 P41
Meja 4 : P04 P16 P28 P40 P42
Meja 5 : P05 P17 P29 P31 P43
Meja 6 : P06 P18 P30 P32 P44
Meja 7 : P07 P19 P21 P33 P45
Meja 8 : P08 P20 P22 P34 P46
Meja 9 : P09 P11 P23 P35 P47
Meja 10: P10 P12 P24 P36 P48
```

---

## 10.4 Babak 4

Offset = 3

```text
Meja 1 : P01 P14 P27 P40 P43
Meja 2 : P02 P15 P28 P31 P44
Meja 3 : P03 P16 P29 P32 P45
Meja 4 : P04 P17 P30 P33 P46
Meja 5 : P05 P18 P21 P34 P47
Meja 6 : P06 P19 P22 P35 P48
Meja 7 : P07 P20 P23 P36 P49
Meja 8 : P08 P11 P24 P37 P50
Meja 9 : P09 P12 P25 P38 P41
Meja 10: P10 P13 P26 P39 P42
```

---

# 11. Generate Pattern Rotation Function

```ts
type GeneratedTable = {
  tableNumber: number;
  players: Participant[];
};

export function generatePatternRotation({
  participants,
  tableCount,
  playersPerTable,
  roundNumber,
}: {
  participants: Participant[];
  tableCount: number;
  playersPerTable: number;
  roundNumber: number;
}): GeneratedTable[] {
  const totalNeeded = tableCount * playersPerTable;

  if (participants.length !== totalNeeded) {
    throw new Error(
      "Pattern rotation ini membutuhkan jumlah peserta pas dengan tableCount * playersPerTable."
    );
  }

  const offsetByRound: Record<number, number> = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
  };

  const roundOffset = offsetByRound[roundNumber] ?? roundNumber - 1;

  const tables: GeneratedTable[] = [];

  for (let tableIndex = 0; tableIndex < tableCount; tableIndex++) {
    const players: Participant[] = [];

    for (let column = 0; column < playersPerTable; column++) {
      const participantIndex =
        column * tableCount +
        ((tableIndex + column * roundOffset) % tableCount);

      players.push(participants[participantIndex]);
    }

    tables.push({
      tableNumber: tableIndex + 1,
      players,
    });
  }

  return tables;
}
```

---

# 12. Jika Jumlah Peserta Tidak Pas 50

Sistem utama ditargetkan untuk 50 peserta.

Namun jika peserta tidak pas, misalnya 48 atau 52, ada 2 opsi.

## 12.1 Opsi MVP

Untuk MVP, batasi peserta harus kelipatan 5 atau sesuai konfigurasi.

Contoh validasi:

```text
Jumlah peserta harus 50 untuk format 10 meja x 5 orang.
```

Ini paling mudah.

---

## 12.2 Opsi Fleksibel

Jika ingin fleksibel:

```text
48 peserta
10 meja
8 meja isi 5 peserta
2 meja isi 4 peserta
```

Namun pattern rotation akan lebih rumit.

Rekomendasi:

```text
Untuk MVP, fokus dulu ke 50 peserta.
Jika nanti perlu fleksibel, buat versi lanjutan.
```

---

# 13. Step 3 — Penalty Check

## 13.1 Tujuan

Penalty digunakan untuk menilai kualitas hasil rotasi.

Semakin kecil penalty, semakin bagus.

Penalty mengecek:

```text
1. Apakah ada peserta yang bertemu ulang.
2. Apakah ada peserta yang langsung bertemu lagi dari babak sebelumnya.
3. Apakah ada komunitas/sektor yang menumpuk.
4. Apakah jumlah peserta per meja tidak sesuai.
```

---

## 13.2 Penalty Pertemuan Ulang

Aturan:

```text
Bertemu lagi dari babak tepat sebelumnya: +1000
Pernah bertemu di babak lain: +500 per pertemuan
Belum pernah bertemu: +0
```

Contoh:

```text
Pak A dan Pak B satu meja di Babak 1.
Lalu di Babak 2 mereka satu meja lagi.
Penalty +1000.
```

Contoh:

```text
Pak A dan Pak B satu meja di Babak 1.
Lalu di Babak 3 mereka satu meja lagi.
Penalty +500.
```

---

## 13.3 Penalty Komunitas Sama

Aturan:

```text
1 peserta dari komunitas tertentu dalam meja: +0
2 peserta dari komunitas sama: +100
3 peserta dari komunitas sama: +400
4 peserta dari komunitas sama: +800
5 peserta dari komunitas sama: +1500
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

---

## 13.4 Penalty Ukuran Meja

Untuk format 50 peserta:

```text
Meja isi 5 peserta: +0
Meja isi 4 peserta: +50
Meja isi 6 peserta: +500
Meja isi kurang dari 4: +1000
Meja isi lebih dari 6: +1000
```

Jika MVP hanya 50 peserta, ukuran meja harus selalu 5.

---

# 14. Pair Key untuk Cek Pertemuan

Untuk mengetahui dua peserta pernah bertemu, gunakan pair key.

```ts
export function createPairKey(participantIdA: string, participantIdB: string): string {
  return [participantIdA, participantIdB].sort().join("__");
}
```

Contoh:

```text
createPairKey("p002", "p001") hasilnya "p001__p002"
createPairKey("p001", "p002") hasilnya "p001__p002"
```

Dengan cara ini, urutan peserta tidak berpengaruh.

---

# 15. Build Meeting Map

Meeting map adalah catatan pasangan peserta yang pernah satu meja.

```ts
type PreviousTable = {
  roundNumber: number;
  tableNumber: number;
  players: Participant[];
};

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

# 16. Calculate Repeated Meeting Penalty

```ts
export function calculateRepeatedMeetingPenalty({
  table,
  meetingMap,
  currentRoundNumber,
}: {
  table: GeneratedTable;
  meetingMap: Map<string, MeetingInfo>;
  currentRoundNumber: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

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
          roundNumber: currentRoundNumber,
          tableNumber: table.tableNumber,
          participantIds: [playerA.id, playerB.id],
          message: `${playerA.name} dan ${playerB.name} sudah bertemu di babak sebelumnya.`,
        });
      } else {
        penalty += 500 * meetingInfo.count;

        warnings.push({
          type: "REPEATED_MEETING_ANY_ROUND",
          roundNumber: currentRoundNumber,
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

---

# 17. Calculate Community Penalty

```ts
export function calculateCommunityPenalty({
  table,
  currentRoundNumber,
}: {
  table: GeneratedTable;
  currentRoundNumber: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

  const communityMap = new Map<string, Participant[]>();

  for (const player of table.players) {
    if (!player.communityId) continue;

    const existing = communityMap.get(player.communityId) ?? [];
    existing.push(player);
    communityMap.set(player.communityId, existing);
  }

  for (const [communityId, players] of communityMap.entries()) {
    const count = players.length;

    if (count <= 1) continue;

    if (count === 2) penalty += 100;
    else if (count === 3) penalty += 400;
    else if (count === 4) penalty += 800;
    else if (count >= 5) penalty += 1500;

    warnings.push({
      type: "SAME_COMMUNITY",
      roundNumber: currentRoundNumber,
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

# 18. Calculate Table Size Penalty

```ts
export function calculateTableSizePenalty({
  table,
  currentRoundNumber,
  expectedPlayersPerTable,
}: {
  table: GeneratedTable;
  currentRoundNumber: number;
  expectedPlayersPerTable: number;
}) {
  const count = table.players.length;

  if (count === expectedPlayersPerTable) {
    return {
      penalty: 0,
      warnings: [] as RotationWarning[],
    };
  }

  let penalty = 0;

  if (count === 4) penalty = 50;
  else if (count === 6) penalty = 500;
  else penalty = 1000;

  return {
    penalty,
    warnings: [
      {
        type: "TABLE_SIZE",
        roundNumber: currentRoundNumber,
        tableNumber: table.tableNumber,
        message: `Meja ${table.tableNumber} berisi ${count} peserta.`,
      },
    ] as RotationWarning[],
  };
}
```

---

# 19. Calculate Total Penalty

```ts
export function calculateTotalPenalty({
  tables,
  previousTables,
  currentRoundNumber,
  expectedPlayersPerTable,
}: {
  tables: GeneratedTable[];
  previousTables: PreviousTable[];
  currentRoundNumber: number;
  expectedPlayersPerTable: number;
}) {
  let totalPenalty = 0;
  const warnings: RotationWarning[] = [];

  const meetingMap = buildMeetingMap(previousTables);

  for (const table of tables) {
    const communityResult = calculateCommunityPenalty({
      table,
      currentRoundNumber,
    });

    totalPenalty += communityResult.penalty;
    warnings.push(...communityResult.warnings);

    const meetingResult = calculateRepeatedMeetingPenalty({
      table,
      meetingMap,
      currentRoundNumber,
    });

    totalPenalty += meetingResult.penalty;
    warnings.push(...meetingResult.warnings);

    const sizeResult = calculateTableSizePenalty({
      table,
      currentRoundNumber,
      expectedPlayersPerTable,
    });

    totalPenalty += sizeResult.penalty;
    warnings.push(...sizeResult.warnings);
  }

  return {
    penalty: totalPenalty,
    warnings,
  };
}
```

---

# 20. Quality Label

Setelah penalty dihitung, tampilkan label kualitas.

```ts
export function getRotationQuality(penalty: number): RotationQuality {
  if (penalty === 0) return "EXCELLENT";
  if (penalty <= 500) return "GOOD";
  if (penalty <= 1500) return "FAIR";
  return "NEED_REVIEW";
}
```

Makna:

```text
EXCELLENT   = Tidak ada masalah berarti
GOOD        = Ada sedikit warning, masih aman
FAIR        = Cukup, admin sebaiknya cek
NEED_REVIEW = Perlu dicek dan mungkin dikoreksi manual
```

---

# 21. Step 4 — Local Swap Optimization

## 21.1 Tujuan

Local swap digunakan untuk memperbaiki hasil pattern rotation.

Bukan random total.

Cara kerja:

```text
1. Sistem punya susunan meja awal dari pattern rotation.
2. Sistem hitung penalty.
3. Sistem coba tukar 2 peserta dari meja berbeda.
4. Jika penalty turun, swap disimpan.
5. Proses diulang sampai tidak ada swap yang membuat hasil lebih baik.
```

---

## 21.2 Kenapa Local Swap Lebih Baik dari Full Random

Local swap lebih baik karena:

```text
1. Mulai dari susunan yang sudah bagus.
2. Tidak perlu mencari kombinasi dari nol.
3. Lebih cepat.
4. Lebih mudah dikontrol.
5. Bisa dijelaskan ke panitia sebagai "sistem menukar peserta untuk mengurangi bentrok".
```

---

## 21.3 Function Swap Players

```ts
export function swapPlayers({
  tables,
  tableAIndex,
  playerAIndex,
  tableBIndex,
  playerBIndex,
}: {
  tables: GeneratedTable[];
  tableAIndex: number;
  playerAIndex: number;
  tableBIndex: number;
  playerBIndex: number;
}): GeneratedTable[] {
  const newTables: GeneratedTable[] = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  const temp = newTables[tableAIndex].players[playerAIndex];

  newTables[tableAIndex].players[playerAIndex] =
    newTables[tableBIndex].players[playerBIndex];

  newTables[tableBIndex].players[playerBIndex] = temp;

  return newTables;
}
```

---

## 21.4 Improve by Local Swap

```ts
export function improveByLocalSwap({
  tables,
  previousTables,
  currentRoundNumber,
  expectedPlayersPerTable,
  maxIterations = 300,
}: {
  tables: GeneratedTable[];
  previousTables: PreviousTable[];
  currentRoundNumber: number;
  expectedPlayersPerTable: number;
  maxIterations?: number;
}) {
  let currentTables = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  let currentResult = calculateTotalPenalty({
    tables: currentTables,
    previousTables,
    currentRoundNumber,
    expectedPlayersPerTable,
  });

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let bestSwap:
      | null
      | {
          tableAIndex: number;
          playerAIndex: number;
          tableBIndex: number;
          playerBIndex: number;
          newPenalty: number;
        } = null;

    for (let tableAIndex = 0; tableAIndex < currentTables.length; tableAIndex++) {
      for (
        let playerAIndex = 0;
        playerAIndex < currentTables[tableAIndex].players.length;
        playerAIndex++
      ) {
        for (
          let tableBIndex = tableAIndex + 1;
          tableBIndex < currentTables.length;
          tableBIndex++
        ) {
          for (
            let playerBIndex = 0;
            playerBIndex < currentTables[tableBIndex].players.length;
            playerBIndex++
          ) {
            const candidateTables = swapPlayers({
              tables: currentTables,
              tableAIndex,
              playerAIndex,
              tableBIndex,
              playerBIndex,
            });

            const candidateResult = calculateTotalPenalty({
              tables: candidateTables,
              previousTables,
              currentRoundNumber,
              expectedPlayersPerTable,
            });

            if (candidateResult.penalty < currentResult.penalty) {
              if (!bestSwap || candidateResult.penalty < bestSwap.newPenalty) {
                bestSwap = {
                  tableAIndex,
                  playerAIndex,
                  tableBIndex,
                  playerBIndex,
                  newPenalty: candidateResult.penalty,
                };
              }
            }
          }
        }
      }
    }

    if (!bestSwap) {
      break;
    }

    currentTables = swapPlayers({
      tables: currentTables,
      tableAIndex: bestSwap.tableAIndex,
      playerAIndex: bestSwap.playerAIndex,
      tableBIndex: bestSwap.tableBIndex,
      playerBIndex: bestSwap.playerBIndex,
    });

    currentResult = calculateTotalPenalty({
      tables: currentTables,
      previousTables,
      currentRoundNumber,
      expectedPlayersPerTable,
    });

    if (currentResult.penalty === 0) {
      break;
    }
  }

  return {
    tables: currentTables,
    penalty: currentResult.penalty,
    warnings: currentResult.warnings,
    quality: getRotationQuality(currentResult.penalty),
  };
}
```

---

## 21.5 Catatan Performa

Untuk 50 peserta:

```text
10 meja
5 peserta per meja
50 peserta total
```

Jumlah kemungkinan swap dalam satu iterasi kira-kira:

```text
50 peserta dibandingkan dengan peserta lain dari meja berbeda
```

Ini masih aman untuk dijalankan di server.

Rekomendasi:

```text
maxIterations = 100 sampai 300
```

Jika terlalu lambat:

```text
turunkan ke 50 atau 100
```

---

# 22. Function Generate Round Lengkap

Function utama untuk generate satu babak:

```ts
export function generateRoundTables({
  participants,
  previousTables,
  roundNumber,
  tableCount = 10,
  playersPerTable = 5,
}: {
  participants: Participant[];
  previousTables: PreviousTable[];
  roundNumber: number;
  tableCount?: number;
  playersPerTable?: number;
}) {
  const sortedParticipants = [...participants].sort((a, b) => {
    const aSeed = a.seedOrder ?? 999999;
    const bSeed = b.seedOrder ?? 999999;
    return aSeed - bSeed;
  });

  const patternTables = generatePatternRotation({
    participants: sortedParticipants,
    tableCount,
    playersPerTable,
    roundNumber,
  });

  const improvedResult = improveByLocalSwap({
    tables: patternTables,
    previousTables,
    currentRoundNumber: roundNumber,
    expectedPlayersPerTable: playersPerTable,
    maxIterations: 300,
  });

  return improvedResult;
}
```

---

# 23. Generate 4 Babak Sekaligus

Karena semua peserta bermain 4 babak, sistem bisa generate 4 babak sekaligus.

Ini lebih bagus karena jadwal sudah siap dari awal.

## 23.1 Flow

```text
1. Peserta dikunci.
2. Seed order dibuat.
3. Babak 1 digenerate.
4. Babak 2 digenerate berdasarkan riwayat Babak 1.
5. Babak 3 digenerate berdasarkan riwayat Babak 1 dan 2.
6. Babak 4 digenerate berdasarkan riwayat Babak 1, 2, dan 3.
7. Semua babak disimpan sebagai draft.
8. Admin bisa review dan koreksi.
```

---

## 23.2 Function

```ts
export function generateAllQualificationRounds({
  participants,
  tableCount = 10,
  playersPerTable = 5,
  roundCount = 4,
}: {
  participants: Participant[];
  tableCount?: number;
  playersPerTable?: number;
  roundCount?: number;
}) {
  const seededParticipants = spreadParticipantsByCommunity(participants);

  const generatedRounds: GeneratedRound[] = [];
  let previousTables: PreviousTable[] = [];

  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber++) {
    const result = generateRoundTables({
      participants: seededParticipants,
      previousTables,
      roundNumber,
      tableCount,
      playersPerTable,
    });

    generatedRounds.push({
      roundNumber,
      tables: result.tables,
      totalPenalty: result.penalty,
      warnings: result.warnings,
      quality: result.quality,
    });

    for (const table of result.tables) {
      previousTables.push({
        roundNumber,
        tableNumber: table.tableNumber,
        players: table.players,
      });
    }
  }

  return {
    seededParticipants,
    rounds: generatedRounds,
  };
}
```

---

# 24. Menyimpan Hasil Generate ke Database

Setelah generate, sistem harus menyimpan:

```text
1. seed_order ke tabel participants.
2. rounds dengan status draft.
3. match_tables untuk setiap meja.
4. table_players untuk setiap peserta di meja.
```

---

## 24.1 Simpan Seed Order

Pseudo:

```ts
for (const participant of seededParticipants) {
  await updateParticipantSeedOrder(participant.id, participant.seedOrder);
}
```

---

## 24.2 Simpan Round

Pseudo:

```ts
const round = await createRound({
  tournamentId,
  roundNumber,
  roundType: "qualification",
  status: "draft",
});
```

---

## 24.3 Simpan Tables

Pseudo:

```ts
for (const generatedTable of generatedRound.tables) {
  const table = await createMatchTable({
    tournamentId,
    roundId: round.id,
    tableNumber: generatedTable.tableNumber,
    status: "draft",
  });

  for (let i = 0; i < generatedTable.players.length; i++) {
    await createTablePlayer({
      tournamentId,
      roundId: round.id,
      tableId: table.id,
      participantId: generatedTable.players[i].id,
      seatNumber: i + 1,
    });
  }
}
```

---

# 25. Manual Override Admin

## 25.1 Admin Harus Bisa Koreksi

Sistem generate hanya rekomendasi.

Admin harus bisa melakukan koreksi manual sebelum babak aktif.

Koreksi yang wajib ada:

```text
1. Generate ulang.
2. Swap peserta antar meja.
3. Simpan draft.
4. Aktifkan babak.
```

---

## 25.2 Kenapa Pakai Swap, Bukan Move

Untuk MVP, gunakan swap peserta.

Swap artinya:

```text
Pak A di Meja 1 ditukar dengan Pak B di Meja 4.
```

Kelebihan swap:

```text
1. Jumlah peserta per meja tetap 5.
2. Lebih mudah dibuat.
3. Tidak menyebabkan meja isi 4 atau 6.
4. Cocok untuk 50 peserta.
```

Move bisa dibuat nanti, tetapi tidak wajib.

---

## 25.3 UI Swap Manual

Contoh UI:

```text
Koreksi Manual Pembagian Meja

Peserta 1:
[Pak Andri - Meja 1]

Peserta 2:
[Pak Budi - Meja 4]

[Tukar Peserta]
```

Setelah klik:

```text
Penalty sebelum: 600
Penalty sesudah: 300

Hasil lebih baik.

[Simpan Perubahan]
[Batal]
```

Jika lebih buruk:

```text
Penalty sebelum: 300
Penalty sesudah: 900

Peringatan: hasil menjadi lebih buruk.
Tetap simpan perubahan?

[Ya, Tetap Simpan]
[Batal]
```

---

## 25.4 Function Swap Manual

```ts
export function manualSwapParticipants({
  tables,
  participantIdA,
  participantIdB,
  previousTables,
  currentRoundNumber,
  expectedPlayersPerTable,
}: {
  tables: GeneratedTable[];
  participantIdA: string;
  participantIdB: string;
  previousTables: PreviousTable[];
  currentRoundNumber: number;
  expectedPlayersPerTable: number;
}) {
  let tableAIndex = -1;
  let playerAIndex = -1;
  let tableBIndex = -1;
  let playerBIndex = -1;

  for (let t = 0; t < tables.length; t++) {
    for (let p = 0; p < tables[t].players.length; p++) {
      const player = tables[t].players[p];

      if (player.id === participantIdA) {
        tableAIndex = t;
        playerAIndex = p;
      }

      if (player.id === participantIdB) {
        tableBIndex = t;
        playerBIndex = p;
      }
    }
  }

  if (tableAIndex === -1 || tableBIndex === -1) {
    throw new Error("Peserta tidak ditemukan dalam susunan meja.");
  }

  if (participantIdA === participantIdB) {
    throw new Error("Tidak bisa menukar peserta yang sama.");
  }

  const oldResult = calculateTotalPenalty({
    tables,
    previousTables,
    currentRoundNumber,
    expectedPlayersPerTable,
  });

  const newTables = swapPlayers({
    tables,
    tableAIndex,
    playerAIndex,
    tableBIndex,
    playerBIndex,
  });

  const newResult = calculateTotalPenalty({
    tables: newTables,
    previousTables,
    currentRoundNumber,
    expectedPlayersPerTable,
  });

  return {
    tables: newTables,
    oldPenalty: oldResult.penalty,
    newPenalty: newResult.penalty,
    warnings: newResult.warnings,
    quality: getRotationQuality(newResult.penalty),
    isBetter: newResult.penalty < oldResult.penalty,
    isWorse: newResult.penalty > oldResult.penalty,
  };
}
```

---

# 26. Validasi Saat Aktifkan Babak

Sebelum babak diaktifkan, sistem wajib validasi.

## 26.1 Validasi Wajib

```text
1. Semua peserta aktif sudah masuk meja.
2. Tidak ada peserta dobel.
3. Tidak ada meja kosong.
4. Semua meja berisi 5 peserta.
5. Tidak ada peserta yang belum punya seat number.
```

---

## 26.2 Validasi Warning

Warning tidak selalu memblokir, tetapi harus ditampilkan.

Contoh warning:

```text
1. Ada peserta yang pernah bertemu lagi.
2. Ada 2 peserta dari komunitas yang sama dalam satu meja.
3. Ada 3 atau lebih peserta dari komunitas yang sama dalam satu meja.
```

---

## 26.3 Warning Berat

Warning berat:

```text
1. Ada peserta yang bertemu lagi dengan lawan dari babak sebelumnya.
2. Ada 3 atau lebih peserta dari komunitas yang sama dalam satu meja.
3. Ada meja yang jumlah pesertanya bukan 5.
```

Jika ada warning berat, sistem minta konfirmasi:

```text
Masih ada 3 peringatan berat.
Apakah tetap ingin mengaktifkan babak?

[Ya, Aktifkan]
[Batal]
```

---

# 27. Function Validate Round Tables

```ts
export function validateRoundTables({
  tables,
  participants,
  expectedPlayersPerTable,
}: {
  tables: GeneratedTable[];
  participants: Participant[];
  expectedPlayersPerTable: number;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const participantIdsInTables: string[] = [];

  for (const table of tables) {
    if (table.players.length === 0) {
      errors.push(`Meja ${table.tableNumber} kosong.`);
    }

    if (table.players.length !== expectedPlayersPerTable) {
      errors.push(
        `Meja ${table.tableNumber} berisi ${table.players.length} peserta, seharusnya ${expectedPlayersPerTable}.`
      );
    }

    for (const player of table.players) {
      participantIdsInTables.push(player.id);
    }
  }

  const uniqueParticipantIds = new Set(participantIdsInTables);

  if (uniqueParticipantIds.size !== participantIdsInTables.length) {
    errors.push("Ada peserta yang muncul lebih dari satu kali.");
  }

  for (const participant of participants) {
    if (!uniqueParticipantIds.has(participant.id)) {
      errors.push(`${participant.name} belum masuk meja mana pun.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

# 28. UI Review Rotasi

Setelah generate, admin melihat halaman review.

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

---

## 28.1 Card Meja

Contoh tampilan:

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

---

## 28.2 Warning Pertemuan Ulang

Contoh:

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

# 29. Admin Bisa Generate Ulang

Admin harus bisa klik:

```text
Generate Ulang
```

Cara kerja:

```text
1. Sistem tetap memakai seed order yang sama.
2. Sistem menjalankan local swap ulang.
3. Jika ingin variasi lebih besar, sistem boleh menambahkan shuffle kecil sebelum local swap.
4. Hasil baru ditampilkan sebagai draft.
```

Untuk MVP, generate ulang boleh berarti:

```text
Jalankan ulang local swap dari pattern awal.
```

Jika hasilnya selalu sama, itu tidak masalah karena pattern stabil.

Jika ingin hasil sedikit berbeda, tambahkan opsi:

```text
Generate Ulang dengan Variasi
```

---

# 30. Optional: Controlled Random Variation

Jika ingin variasi generate ulang, lakukan random swap kecil pada pattern awal sebelum local swap.

Contoh:

```ts
export function addSmallRandomVariation({
  tables,
  swapCount = 10,
}: {
  tables: GeneratedTable[];
  swapCount?: number;
}) {
  let result = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  for (let i = 0; i < swapCount; i++) {
    const tableAIndex = Math.floor(Math.random() * result.length);
    let tableBIndex = Math.floor(Math.random() * result.length);

    while (tableBIndex === tableAIndex) {
      tableBIndex = Math.floor(Math.random() * result.length);
    }

    const playerAIndex = Math.floor(
      Math.random() * result[tableAIndex].players.length
    );

    const playerBIndex = Math.floor(
      Math.random() * result[tableBIndex].players.length
    );

    result = swapPlayers({
      tables: result,
      tableAIndex,
      playerAIndex,
      tableBIndex,
      playerBIndex,
    });
  }

  return result;
}
```

Flow generate ulang variasi:

```text
1. Ambil pattern awal.
2. Lakukan 10 random swap kecil.
3. Jalankan local swap optimization.
4. Tampilkan hasil.
```

---

# 31. Audit Log Manual Override

Semua tindakan penting harus dicatat.

## 31.1 Tabel audit_logs

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  round_id uuid null,
  table_id uuid null,
  actor_id uuid null,
  action text not null,
  description text not null,
  metadata jsonb null,
  created_at timestamp not null default now()
);
```

---

## 31.2 Action yang Perlu Dicatat

```text
CREATE_SEED_ORDER
GENERATE_ROUND
REGENERATE_ROUND
SWAP_PARTICIPANTS
ACTIVATE_ROUND
LOCK_ROUND
UNLOCK_ROUND
UPDATE_SCORE
MANUAL_RANKING
```

---

## 31.3 Contoh Metadata Swap

```json
{
  "participantA": {
    "id": "p001",
    "name": "Pak Andri",
    "fromTable": 1,
    "toTable": 4
  },
  "participantB": {
    "id": "p019",
    "name": "Pak Budi",
    "fromTable": 4,
    "toTable": 1
  },
  "oldPenalty": 600,
  "newPenalty": 300
}
```

---

# 32. Contoh Simulasi Lengkap

## 32.1 Data Peserta Singkat

Misalnya ada 10 peserta dan 2 meja untuk contoh kecil.

```text
P01 Pak A - Sektor 1
P02 Pak B - Sektor 2
P03 Pak C - Sektor 3
P04 Pak D - Sektor 4
P05 Pak E - Sektor 5
P06 Pak F - Sektor 1
P07 Pak G - Sektor 2
P08 Pak H - Sektor 3
P09 Pak I - Sektor 4
P10 Pak J - Sektor 5
```

Untuk contoh kecil:

```text
2 meja
5 peserta per meja
```

---

## 32.2 Babak 1

Pattern:

```text
Meja 1: P01 P03 P05 P07 P09
Meja 2: P02 P04 P06 P08 P10
```

---

## 32.3 Babak 2

Pattern offset berbeda:

```text
Meja 1: P01 P04 P07 P10 P03
Meja 2: P02 P05 P08 P09 P06
```

Sistem cek:

```text
Apakah P01 bertemu P03 lagi?
Apakah P01 bertemu P05 lagi?
Apakah Sektor 1 menumpuk?
```

Jika ada warning, sistem local swap.

---

# 33. Batasan MVP

Untuk MVP, cukup implementasikan:

```text
1. Jumlah peserta tepat 50.
2. Jumlah meja 10.
3. Peserta per meja 5.
4. Babak penyisihan 4.
5. Community spreading.
6. Pattern rotation.
7. Penalty check.
8. Local swap optimization.
9. Manual swap admin.
```

Tidak perlu dulu:

```text
1. Jumlah peserta fleksibel.
2. Drag and drop.
3. Optimasi matematis kompleks.
4. Algoritma AI.
5. Live scoring.
```

---

# 34. Acceptance Criteria

Fitur rotasi dianggap selesai jika:

```text
1. Admin bisa mengunci peserta dan membuat seed order.
2. Seed order menyebar komunitas/sektor.
3. Sistem bisa generate Babak 1 sampai Babak 4.
4. Setiap babak berisi 10 meja.
5. Setiap meja berisi 5 peserta.
6. Tidak ada peserta dobel dalam satu babak.
7. Tidak ada peserta yang tidak masuk meja.
8. Sistem memberi warning jika komunitas sama menumpuk.
9. Sistem memberi warning jika peserta bertemu ulang.
10. Sistem memberi label kualitas rotasi.
11. Sistem melakukan local swap otomatis untuk mengurangi penalty.
12. Admin bisa swap peserta manual.
13. Setelah swap manual, penalty dihitung ulang.
14. Admin bisa tetap menyimpan hasil meski penalty lebih buruk dengan konfirmasi.
15. Admin bisa mengaktifkan babak setelah validasi.
```

---

# 35. Ringkasan Implementasi

Urutan implementasi yang disarankan:

```text
1. Buat type Participant, GeneratedTable, GeneratedRound.
2. Buat function spreadParticipantsByCommunity.
3. Buat function generatePatternRotation.
4. Buat function createPairKey.
5. Buat function buildMeetingMap.
6. Buat function calculateCommunityPenalty.
7. Buat function calculateRepeatedMeetingPenalty.
8. Buat function calculateTableSizePenalty.
9. Buat function calculateTotalPenalty.
10. Buat function getRotationQuality.
11. Buat function swapPlayers.
12. Buat function improveByLocalSwap.
13. Buat function generateRoundTables.
14. Buat function generateAllQualificationRounds.
15. Buat UI review rotasi.
16. Buat UI manual swap.
17. Buat validasi aktifkan babak.
18. Buat audit log.
```

---

# 36. Ringkasan Rule untuk Ditampilkan ke Admin

Teks yang bisa ditampilkan di sistem:

```text
Sistem membuat rotasi meja dengan mempertimbangkan:
1. Peserta sebisa mungkin tidak bertemu lawan yang sama.
2. Peserta sebisa mungkin tidak bertemu lawan dari babak sebelumnya.
3. Peserta dari komunitas/sektor yang sama sebisa mungkin tidak menumpuk.
4. Jika hasil belum ideal, admin dapat menukar peserta secara manual.
```

---

# 37. Catatan Akhir

Generate rotasi tidak harus sempurna.

Yang penting:

```text
1. Sistem punya pola dasar yang adil.
2. Sistem bisa mendeteksi masalah.
3. Sistem mencoba memperbaiki otomatis.
4. Admin tetap bisa koreksi manual.
5. Semua perubahan penting tercatat.
```

Pendekatan terbaik untuk MVP:

```text
Community Spreading
+ Pattern Rotation
+ Local Swap
+ Manual Swap Admin
```

Pendekatan ini jauh lebih baik daripada full random, lebih cepat, lebih stabil, dan lebih mudah diimplementasikan oleh model AI/developer dengan kemampuan rendah-menengah.

```
```
