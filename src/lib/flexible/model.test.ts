import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTierDraw,
  reviewTierDraw,
  RuleError,
  unlockRoundResults,
  type EventData,
  type ScoreEntry,
} from "./model";
import { formatPublicCode, validPublicCode } from "./public-code";
import { calculateStandings } from "./scoring";
import { createSchedulePdf } from "./schedule-pdf";

function randomSequence(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

function eventWithLockedFirstRound(participantCount: number): EventData {
  const tableCount = Math.ceil(participantCount / 5);
  const sizes = Array.from({ length: tableCount }, (_, index) => Math.floor(participantCount / tableCount) + (index < participantCount % tableCount ? 1 : 0));
  const participants = Array.from({ length: participantCount }, (_, index) => ({ id: `p${index + 1}`, number: index + 1, name: `Peserta ${index + 1}`, communityId: `c${index % Math.max(2, tableCount)}` }));
  let cursor = 0;
  const tables = sizes.map(size => participants.slice(cursor, cursor += size).map(person => person.id));
  const results = tables.map((table, tableIndex) => ({
    round: 1,
    table: tableIndex + 1,
    submittedAt: "2026-01-01T00:00:00.000Z",
    scores: table.map((participantId, index): ScoreEntry => ({ participantId, score: 100 - index, tableRank: index + 1, tournamentPoint: Math.max(0, 5 - index) })),
  }));
  return {
    dataVersion: 2,
    settings: { name: "Uji Shuffle Tier", target: participantCount, capacity: 5, rounds: 3, advancing: Math.max(1, Math.floor(participantCount / 2)) },
    communities: Array.from({ length: Math.max(2, tableCount) }, (_, index) => ({ id: `c${index}`, name: `Komunitas ${index}`, normalizedName: `komunitas ${index}` })),
    participants,
    draws: [{ number: 1, locked: true, tables, revision: 1, generation: "random" }],
    results,
    resultStates: [{ round: 1, revision: 1, lockedAt: "2026-01-01T01:00:00.000Z" }],
    qualifiedIds: [],
    qualificationLockedAt: null,
    drawShareCode: null,
    standingsShareToken: null,
    standingsShareHash: null,
    standingsShareCode: null,
    audit: [],
    parentId: null,
  };
}

function assertValidRoster(data: EventData, tables: string[][]) {
  assert.equal(tables.flat().length, data.participants.length);
  assert.equal(new Set(tables.flat()).size, data.participants.length);
  assert.deepEqual([...tables.flat()].sort(), data.participants.map(person => person.id).sort());
  assert.ok(tables.every(table => table.length <= 5));
  assert.ok(Math.max(...tables.map(table => table.length)) - Math.min(...tables.map(table => table.length)) <= 1);
}

test("Shuffle Tier membagi 10 peserta merata dan memisahkan Top 2 dari meja asal", () => {
  const data = eventWithLockedFirstRound(10);
  const draw = generateTierDraw(data, 2, randomSequence(7));
  assert.equal(draw.generation, "tier");
  assert.equal(draw.tier?.sourceTables?.p1, 1);
  assert.equal(draw.tier?.sourceTables?.p6, 2);
  assert.deepEqual(draw.tables.map(table => table.length), [5, 5]);
  assertValidRoster(data, draw.tables);
  const review = reviewTierDraw(data, draw);
  assert.ok(review);
  assert.equal(review.topPairRematches, 0);
  for (const sourceTable of data.draws[0].tables) {
    const top = sourceTable.slice(0, 2);
    assert.notEqual(draw.tables.findIndex(table => table.includes(top[0])), draw.tables.findIndex(table => table.includes(top[1])));
  }
});

test("Shuffle Tier 25 peserta menghasilkan dua meja Top dan tiga meja Pengejar", () => {
  const data = eventWithLockedFirstRound(25);
  const draw = generateTierDraw(data, 2, randomSequence(19));
  assertValidRoster(data, draw.tables);
  const review = reviewTierDraw(data, draw);
  assert.ok(review);
  assert.equal(review.topPairRematches, 0);
  assert.equal(review.pureTopTables, 2);
  assert.equal(review.pureChaserTables, 3);
  assert.equal(review.mixedTables, 0);
});

test("Shuffle Tier tetap valid untuk jumlah peserta 6–60 dan skala besar", () => {
  for (const participantCount of [...Array.from({ length: 55 }, (_, index) => index + 6), 100, 200, 500]) {
    const data = eventWithLockedFirstRound(participantCount);
    const draw = generateTierDraw(data, 2, randomSequence(participantCount));
    assertValidRoster(data, draw.tables);
    const review = reviewTierDraw(data, draw);
    assert.ok(review, `${participantCount} peserta harus memiliki review tier`);
    assert.equal(review.topPairRematches, 0, `${participantCount} peserta masih mempertemukan Top 2 dari meja yang sama`);
  }
});

test("Shuffle Tier ditolak jika hasil babak sebelumnya belum dikunci", () => {
  const data = eventWithLockedFirstRound(10);
  data.resultStates[0].lockedAt = null;
  assert.throws(() => generateTierDraw(data, 2, randomSequence(3)), (error: unknown) => error instanceof RuleError && /Kunci seluruh hasil/.test(error.message));
});

test("membuka hasil membatalkan draft Shuffle Tier yang bergantung padanya", () => {
  const data = eventWithLockedFirstRound(10);
  data.draws.push(generateTierDraw(data, 2, randomSequence(11)));
  assert.equal(unlockRoundResults(data, 1), 1);
  assert.equal(data.draws.some(draw => draw.number === 2), false);
  assert.equal(data.resultStates[0].lockedAt, null);
  assert.equal(data.resultStates[0].revision, 2);
});

test("hasil tidak dapat dibuka selama pembagian Shuffle Tier turunannya terkunci", () => {
  const data = eventWithLockedFirstRound(10);
  const dependent = generateTierDraw(data, 2, randomSequence(13));
  dependent.locked = true;
  data.draws.push(dependent);
  assert.throws(() => unlockRoundResults(data, 1), (error: unknown) => error instanceof RuleError && /Buka kunci pembagian babak 2/.test(error.message));
});

test("kode publik memakai tanggal dan jam WIB sampai detik", () => {
  const code = formatPublicCode(new Date("2026-09-17T07:32:05.000Z"));
  assert.equal(code, "260917-143205");
  assert.equal(validPublicCode(code), true);
  assert.equal(validPublicCode("260917-1432"), false);
});

test("klasemen membandingkan skor sebelum medali dan tidak memakai nomor peserta", () => {
  const data = eventWithLockedFirstRound(2);
  data.participants = [
    { id: "p-high-number", number: 99, name: "Nomor Besar", communityId: "c0" },
    { id: "p-low-number", number: 1, name: "Nomor Kecil", communityId: "c1" },
    { id: "p-high-score", number: 10, name: "Skor Besar", communityId: "c0" },
    { id: "p-more-gold", number: 11, name: "Gold Lebih Banyak", communityId: "c1" },
  ];
  data.results = [
    { round: 1, table: 1, submittedAt: "2026-01-01T00:00:00.000Z", scores: [
      { participantId: "p-high-number", score: 500, tableRank: 2, tournamentPoint: 4 },
      { participantId: "p-low-number", score: 500, tableRank: 2, tournamentPoint: 4 },
      { participantId: "p-high-score", score: 900, tableRank: 2, tournamentPoint: 5 },
      { participantId: "p-more-gold", score: 800, tableRank: 1, tournamentPoint: 5 },
    ] },
  ];

  const standings = calculateStandings(data);
  assert.deepEqual(standings.map(row => row.participantId), ["p-high-score", "p-more-gold", "p-high-number", "p-low-number"]);
});

test("PDF pembagian membuat dua halaman untuk sembilan meja tanpa halaman kosong", async () => {
  const data = eventWithLockedFirstRound(45);
  const draw = data.draws[0];
  const pdf = await createSchedulePdf({
    name: "Turnamen Uji PDF",
    draw,
    participants: data.participants.map(person => ({ ...person, community: `Komunitas ${person.communityId}` })),
    publicUrl: "https://remi.example/m/260921-120000",
  });
  const source = pdf.toString("latin1");
  assert.equal(source.startsWith("%PDF-"), true);
  assert.equal((source.match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.ok(pdf.length > 10_000);
});
