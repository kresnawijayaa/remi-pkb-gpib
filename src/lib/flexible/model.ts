import { z } from "zod";

export const settingsSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(100),
  target: z.coerce.number().int().min(2).max(500),
  capacity: z.coerce.number().int().min(2).max(5),
  rounds: z.coerce.number().int().min(1).max(20),
  advancing: z.coerce.number().int().min(1).max(500),
}).refine(value => value.advancing <= value.target, { message: "Peserta lolos tidak boleh melebihi target peserta.", path: ["advancing"] });

export type Settings = z.infer<typeof settingsSchema>;
export type Community = { id: string; name: string; normalizedName: string };
export type Person = { id: string; number: number; name: string; communityId: string | null };
export type TierDrawSource = { sourceRound: number; sourceResultRevision: number; sourceRanks: Record<string, number>; sourceTables?: Record<string, number> };
export type Draw = { number: number; locked: boolean; tables: string[][]; revision: number; generation?: "random" | "seeded" | "tier"; tier?: TierDrawSource };
export type ScoreEntry = { participantId: string; score: number; tableRank: number; tournamentPoint: number };
export type TableResult = { round: number; table: number; submittedAt: string; scores: ScoreEntry[] };
export type RoundResultState = { round: number; revision: number; lockedAt: string | null };
export type EventData = { dataVersion: 2; settings: Settings; communities: Community[]; participants: Person[]; draws: Draw[]; results: TableResult[]; resultStates: RoundResultState[]; qualifiedIds: string[]; qualificationLockedAt: string | null; drawShareCode: string | null; standingsShareToken: string | null; standingsShareHash: string | null; standingsShareCode: string | null; audit: { at: string; action: string }[]; parentId: string | null };
export type EventRecord = { id: string; version: number; data: EventData; shareToken: string | null };
export class RuleError extends Error {}

export function normalizeCommunityName(name: string) { return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID"); }

function stableCommunityId(name: string) {
  let hash = 2166136261;
  for (const character of normalizeCommunityName(name)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `community-${(hash >>> 0).toString(36)}`;
}

export function upgradeEventData(raw: unknown): EventData {
  const source = raw as Omit<Partial<EventData>, "participants"> & { participants?: Array<Partial<Person> & { community?: string }> };
  const communities = [...(source.communities ?? [])];
  const byName = new Map(communities.map(item => [normalizeCommunityName(item.name), item]));
  const participants = (source.participants ?? []).map(person => {
    let communityId = person.communityId ?? null;
    const legacyName = person.community?.trim();
    if (!communityId && legacyName) {
      const normalizedName = normalizeCommunityName(legacyName);
      let community = byName.get(normalizedName);
      if (!community) {
        community = { id: stableCommunityId(legacyName), name: legacyName, normalizedName };
        communities.push(community);
        byName.set(normalizedName, community);
      }
      communityId = community.id;
    }
    return { id: String(person.id), number: Number(person.number), name: String(person.name), communityId };
  });
  const results = (source.results ?? []).map(result => ({ ...result, scores: result.scores.map(score => ({ ...score, tournamentPoint: Math.max(0, 6 - score.tableRank) })) }));
  const qualificationLockedAt = source.qualificationLockedAt ?? null;
  const resultStates = [...(source.resultStates ?? [])].map(state => ({ round: Number(state.round), revision: Math.max(1, Number(state.revision) || 1), lockedAt: state.lockedAt ? String(state.lockedAt) : null }));
  for (const round of new Set(results.map(result => result.round))) {
    if (!resultStates.some(state => state.round === round)) resultStates.push({ round, revision: 1, lockedAt: qualificationLockedAt });
  }
  return { dataVersion: 2, settings: source.settings as Settings, communities, participants, draws: source.draws ?? [], results, resultStates, qualifiedIds: source.qualifiedIds ?? [], qualificationLockedAt, drawShareCode: source.drawShareCode ?? null, standingsShareToken: source.standingsShareToken ?? null, standingsShareHash: source.standingsShareHash ?? null, standingsShareCode: source.standingsShareCode ?? null, audit: source.audit ?? [], parentId: source.parentId ?? null };
}

export function communityName(data: EventData, person: Person) { return data.communities.find(item => item.id === person.communityId)?.name ?? ""; }

export function assertRosterEditable(data: EventData) {
  if (data.draws.some(draw => draw.locked)) throw new RuleError("Buka kunci pembagian terlebih dahulu sebelum mengubah peserta atau komunitas.");
}

export function resultState(data: EventData, round: number) {
  return data.resultStates.find(state => state.round === round);
}

export function isRoundResultLocked(data: EventData, round: number) {
  return Boolean(resultState(data, round)?.lockedAt);
}

export function roundScoringComplete(data: EventData, round: number) {
  const draw = data.draws.find(item => item.number === round && item.locked);
  if (!draw) return false;
  return draw.tables.every((table, tableIndex) => {
    const result = data.results.find(item => item.round === round && item.table === tableIndex + 1);
    if (!result || result.scores.length !== table.length) return false;
    const expected = new Set(table);
    return new Set(result.scores.map(score => score.participantId)).size === table.length && result.scores.every(score => expected.has(score.participantId));
  });
}

function ensureResultState(data: EventData, round: number) {
  let state = resultState(data, round);
  if (!state) {
    state = { round, revision: 1, lockedAt: null };
    data.resultStates.push(state);
  }
  return state;
}

export function markRoundResultsChanged(data: EventData, round: number) {
  const state = ensureResultState(data, round);
  if (state.lockedAt) throw new RuleError(`Hasil babak ${round} sudah dikunci. Buka kunci hasil sebelum mengubah skor.`);
  state.revision++;
}

export function lockRoundResults(data: EventData, round: number, lockedAt = new Date().toISOString()) {
  if (!roundScoringComplete(data, round)) throw new RuleError("Lengkapi dan periksa seluruh skor meja pada babak ini sebelum mengunci hasil.");
  const state = ensureResultState(data, round);
  if (state.lockedAt) throw new RuleError(`Hasil babak ${round} sudah dikunci.`);
  state.lockedAt = lockedAt;
}

export function unlockRoundResults(data: EventData, round: number) {
  if (data.qualificationLockedAt) throw new RuleError("Buka kunci kelolosan sebelum membuka hasil babak.");
  const state = resultState(data, round);
  if (!state?.lockedAt) throw new RuleError(`Hasil babak ${round} belum dikunci.`);
  const dependents = data.draws.filter(draw => draw.generation === "tier" && draw.tier?.sourceRound === round);
  const lockedDependent = dependents.find(draw => draw.locked);
  if (lockedDependent) throw new RuleError(`Buka kunci pembagian babak ${lockedDependent.number} terlebih dahulu. Pembagian itu memakai hasil babak ${round}.`);
  const dependentNumbers = new Set(dependents.map(draw => draw.number));
  data.draws = data.draws.filter(draw => !dependentNumbers.has(draw.number));
  state.lockedAt = null;
  state.revision++;
  return dependents.length;
}

export function assertScoreEditable(data: EventData, round?: number) {
  if (data.qualificationLockedAt) throw new RuleError("Kelolosan sudah dikunci. Buka kunci kelolosan sebelum mengubah skor.");
  if (round && isRoundResultLocked(data, round)) throw new RuleError(`Hasil babak ${round} sudah dikunci. Buka kunci hasil sebelum mengubah skor.`);
}

function pairKey(first: string, second: string) { return [first, second].sort().join(":"); }
function meetingMap(previous: Draw[]) {
  const meetings = new Map<string, number>();
  for (const draw of previous) for (const table of draw.tables) for (let first = 0; first < table.length; first++) for (let second = first + 1; second < table.length; second++) {
    const key = pairKey(table[first], table[second]);
    meetings.set(key, (meetings.get(key) ?? 0) + 1);
  }
  return meetings;
}

export function reviewDraw(tables: string[][], participants: Person[], previous: Draw[]) {
  const people = new Map(participants.map(person => [person.id, person]));
  const meetings = meetingMap(previous);
  let repeats = 0;
  let sameCommunity = 0;
  let communityPenalty = 0;
  for (const table of tables) {
    const counts = new Map<string, number>();
    for (const id of table) {
      const communityId = people.get(id)?.communityId;
      if (communityId) counts.set(communityId, (counts.get(communityId) ?? 0) + 1);
    }
    for (const count of counts.values()) { sameCommunity += count * (count - 1) / 2; communityPenalty += Math.max(0, count - 1) ** 2 * 25; }
    for (let first = 0; first < table.length; first++) for (let second = first + 1; second < table.length; second++) repeats += meetings.get(pairKey(table[first], table[second])) ?? 0;
  }
  return { repeats, sameCommunity, penalty: repeats * 1000 + communityPenalty };
}

function shuffle<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [items[index], items[other]] = [items[other], items[index]]; }
  return items;
}

export function generateDraw(data: EventData, number: number, random = Math.random): Draw {
  if (number < 1 || number > data.settings.rounds) throw new RuleError("Nomor babak tidak valid.");
  if (data.participants.length !== data.settings.target) throw new RuleError("Lengkapi peserta sesuai target, atau sesuaikan target di pengaturan.");
  if (data.draws.some(draw => draw.number === number && draw.locked)) throw new RuleError("Pembagian ini sudah dikunci.");
  const previous = data.draws.filter(draw => draw.number < number && draw.locked);
  if (previous.length !== number - 1) throw new RuleError("Kunci pembagian babak sebelumnya terlebih dahulu. Skor tidak diperlukan.");
  const tableCount = Math.ceil(data.participants.length / data.settings.capacity);
  const sizes = Array.from({ length: tableCount }, (_, index) => Math.floor(data.participants.length / tableCount) + (index < data.participants.length % tableCount ? 1 : 0));
  const meetings = meetingMap(previous);
  const people = new Map(data.participants.map(person => [person.id, person]));
  const grouped = new Map<string, Person[]>();
  for (const person of data.participants) { const key = person.communityId ?? `person:${person.id}`; grouped.set(key, [...(grouped.get(key) ?? []), person]); }
  let best: string[][] = [];
  let bestPenalty = Infinity;
  const attempts = data.participants.length > 100 ? 12 : 24;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ordered = shuffle([...grouped.values()].map(group => shuffle([...group], random)), random).sort((first, second) => second.length - first.length).flat();
    const tables: string[][] = sizes.map(() => []);
    for (const person of ordered) {
      let selected = 0;
      let lowest = Infinity;
      tables.forEach((table, index) => {
        if (table.length >= sizes[index]) return;
        const sameCount = table.filter(id => Boolean(person.communityId) && people.get(id)?.communityId === person.communityId).length;
        const repeatCost = table.reduce((sum, id) => sum + (meetings.get(pairKey(person.id, id)) ?? 0) * 1000, 0);
        const cost = repeatCost + sameCount ** 2 * 25 + table.length * 0.1 + random();
        if (cost < lowest) { selected = index; lowest = cost; }
      });
      tables[selected].push(person.id);
    }
    let penalty = reviewDraw(tables, data.participants, previous).penalty;
    for (let iteration = 0; iteration < Math.min(2000, data.participants.length * 8); iteration++) {
      const firstTable = Math.floor(random() * tables.length);
      let secondTable = Math.floor(random() * tables.length);
      if (firstTable === secondTable) secondTable = (secondTable + 1) % tables.length;
      const firstSeat = Math.floor(random() * tables[firstTable].length);
      const secondSeat = Math.floor(random() * tables[secondTable].length);
      [tables[firstTable][firstSeat], tables[secondTable][secondSeat]] = [tables[secondTable][secondSeat], tables[firstTable][firstSeat]];
      const candidate = reviewDraw(tables, data.participants, previous).penalty;
      if (candidate <= penalty) penalty = candidate;
      else [tables[firstTable][firstSeat], tables[secondTable][secondSeat]] = [tables[secondTable][secondSeat], tables[firstTable][firstSeat]];
    }
    if (penalty < bestPenalty) { best = tables.map(table => [...table]); bestPenalty = penalty; }
    if (penalty === 0) break;
  }
  return { number, locked: false, tables: best, revision: (data.draws.find(draw => draw.number === number)?.revision ?? 0) + 1, generation: "random" };
}

export type TierTableReview = { table: number; top: number; chaser: number; rankCounts: Record<number, number>; kind: "top" | "chaser" | "mixed" };
export type TierDrawReview = {
  sourceRound: number;
  topPairRematches: number;
  chaserGroupRematches: number;
  sourceRematches: number;
  crossTierPairs: number;
  historicalRepeats: number;
  sameCommunity: number;
  pureTopTables: number;
  pureChaserTables: number;
  mixedTables: number;
  rankImbalance: number;
  tables: TierTableReview[];
  penalty: number;
};

export function reviewTierDraw(data: EventData, draw: Draw): TierDrawReview | null {
  if (draw.generation !== "tier" || !draw.tier) return null;
  const sourceDraw = data.draws.find(item => item.number === draw.tier?.sourceRound);
  if (!sourceDraw) return null;
  const sourceTable = new Map<string, number>(Object.entries(draw.tier.sourceTables ?? {}).map(([id, table]) => [id, table]));
  sourceDraw.tables.forEach((table, tableIndex) => table.forEach(id => { if (!sourceTable.has(id)) sourceTable.set(id, tableIndex + 1); }));
  let topPairRematches = 0;
  let chaserGroupRematches = 0;
  let sourceRematches = 0;
  let crossTierPairs = 0;
  let rankImbalance = 0;
  const tables = draw.tables.map((table, tableIndex): TierTableReview => {
    const rankCounts: Record<number, number> = {};
    let top = 0;
    let chaser = 0;
    for (const id of table) {
      const rank = draw.tier!.sourceRanks[id];
      rankCounts[rank] = (rankCounts[rank] ?? 0) + 1;
      if (rank <= 2) top++;
      else chaser++;
    }
    crossTierPairs += top * chaser;
    rankImbalance += Math.abs((rankCounts[1] ?? 0) - (rankCounts[2] ?? 0));
    const chaserCounts = [rankCounts[3] ?? 0, rankCounts[4] ?? 0, rankCounts[5] ?? 0];
    rankImbalance += Math.max(...chaserCounts) - Math.min(...chaserCounts);
    for (let first = 0; first < table.length; first++) for (let second = first + 1; second < table.length; second++) {
      const firstId = table[first];
      const secondId = table[second];
      if (sourceTable.get(firstId) !== sourceTable.get(secondId)) continue;
      sourceRematches++;
      const firstTop = draw.tier!.sourceRanks[firstId] <= 2;
      const secondTop = draw.tier!.sourceRanks[secondId] <= 2;
      if (firstTop && secondTop) topPairRematches++;
      if (!firstTop && !secondTop) chaserGroupRematches++;
    }
    return { table: tableIndex + 1, top, chaser, rankCounts, kind: top && chaser ? "mixed" : top ? "top" : "chaser" };
  });
  const rotation = reviewDraw(draw.tables, data.participants, data.draws.filter(item => item.number < draw.number && item.locked));
  const pureTopTables = tables.filter(table => table.kind === "top").length;
  const pureChaserTables = tables.filter(table => table.kind === "chaser").length;
  const mixedTables = tables.filter(table => table.kind === "mixed").length;
  const penalty = topPairRematches * 1_000_000_000 + crossTierPairs * 1_000_000 + chaserGroupRematches * 100_000 + sourceRematches * 20_000 + rankImbalance * 5_000 + rotation.repeats * 1_000 + rotation.sameCommunity * 25;
  return { sourceRound: draw.tier.sourceRound, topPairRematches, chaserGroupRematches, sourceRematches, crossTierPairs, historicalRepeats: rotation.repeats, sameCommunity: rotation.sameCommunity, pureTopTables, pureChaserTables, mixedTables, rankImbalance, tables, penalty };
}

export function generateTierDraw(data: EventData, number: number, random = Math.random): Draw {
  if (number <= 1 || number > data.settings.rounds) throw new RuleError("Shuffle Tier hanya tersedia mulai babak 2.");
  if (data.participants.length !== data.settings.target) throw new RuleError("Lengkapi peserta sesuai target terlebih dahulu.");
  if (data.draws.some(draw => draw.number === number && draw.locked)) throw new RuleError("Pembagian ini sudah dikunci.");
  const previous = data.draws.filter(draw => draw.number < number && draw.locked);
  if (previous.length !== number - 1) throw new RuleError("Kunci pembagian babak sebelumnya terlebih dahulu.");
  const sourceRound = number - 1;
  const sourceDraw = data.draws.find(draw => draw.number === sourceRound && draw.locked);
  const sourceState = resultState(data, sourceRound);
  if (!sourceDraw || !sourceState?.lockedAt) throw new RuleError(`Kunci seluruh hasil babak ${sourceRound} sebelum menggunakan Shuffle Tier.`);
  if (!roundScoringComplete(data, sourceRound)) throw new RuleError(`Hasil babak ${sourceRound} belum lengkap.`);
  const tableCount = Math.ceil(data.participants.length / data.settings.capacity);
  if (tableCount < 2) throw new RuleError("Shuffle Tier memerlukan minimal dua meja agar peserta dapat dipisahkan.");
  const sizes = Array.from({ length: tableCount }, (_, index) => Math.floor(data.participants.length / tableCount) + (index < data.participants.length % tableCount ? 1 : 0));
  const sourceRanks: Record<string, number> = {};
  for (const result of data.results.filter(item => item.round === sourceRound)) for (const score of result.scores) sourceRanks[score.participantId] = score.tableRank;
  if (data.participants.some(person => !sourceRanks[person.id])) throw new RuleError(`Setiap peserta harus memiliki ranking pada babak ${sourceRound}.`);
  const topGroups = sourceDraw.tables.map(table => table.filter(id => sourceRanks[id] <= 2).sort((first, second) => sourceRanks[first] - sourceRanks[second]));
  if (topGroups.some(group => group.length !== Math.min(2, sourceDraw.tables[0]?.length ?? 0))) throw new RuleError("Ranking Top 2 babak sebelumnya tidak lengkap.");
  const topCount = topGroups.reduce((sum, group) => sum + group.length, 0);
  let topTableCount = Math.min(tableCount, Math.max(2, Math.ceil(topCount / data.settings.capacity)));
  while (topTableCount < tableCount && sizes.slice(0, topTableCount).reduce((sum, size) => sum + size, 0) < topCount) topTableCount++;
  const people = new Map(data.participants.map(person => [person.id, person]));
  const sourceTable = new Map<string, number>();
  sourceDraw.tables.forEach((table, tableIndex) => table.forEach(id => sourceTable.set(id, tableIndex + 1)));
  const meetings = meetingMap(previous);
  const sourceTables = Object.fromEntries(sourceTable.entries());
  const tier: TierDrawSource = { sourceRound, sourceResultRevision: sourceState.revision, sourceRanks, sourceTables };
  let best: Draw | null = null;
  let bestPenalty = Infinity;

  function assign(ids: string[], tables: string[][], candidates: number[]) {
    for (const id of ids) {
      const person = people.get(id)!;
      let selected = -1;
      let lowest = Infinity;
      for (const tableIndex of candidates) {
        const table = tables[tableIndex];
        if (table.length >= sizes[tableIndex]) continue;
        const sameSource = table.filter(other => sourceTable.get(other) === sourceTable.get(id)).length;
        const repeatCost = table.reduce((sum, other) => sum + (meetings.get(pairKey(id, other)) ?? 0), 0);
        const sameCommunity = table.filter(other => Boolean(person.communityId) && people.get(other)?.communityId === person.communityId).length;
        const sameRank = table.filter(other => sourceRanks[other] === sourceRanks[id]).length;
        const cost = sameSource * 100_000 + repeatCost * 1_000 + sameCommunity * 25 + sameRank * 5 + table.length + random();
        if (cost < lowest) { selected = tableIndex; lowest = cost; }
      }
      if (selected < 0) throw new RuleError("Komposisi tier tidak dapat ditempatkan pada kapasitas meja yang tersedia.");
      tables[selected].push(id);
    }
  }

  for (let attempt = 0; attempt < 64; attempt++) {
    const tables: string[][] = sizes.map(() => []);
    const groups = shuffle(topGroups.map(group => [...group]), random);
    const rotation = Math.floor(random() * topTableCount);
    const offset = 1 + Math.floor(random() * Math.max(1, topTableCount - 1));
    groups.forEach((group, groupIndex) => {
      const firstTable = (groupIndex + rotation) % topTableCount;
      let secondTable = (firstTable + offset) % topTableCount;
      if (secondTable === firstTable || tables[secondTable].length >= sizes[secondTable]) {
        secondTable = Array.from({ length: topTableCount }, (_, index) => index).find(index => index !== firstTable && tables[index].length < sizes[index]) ?? firstTable;
      }
      const reverse = (groupIndex + attempt) % 2 === 1;
      tables[firstTable].push(group[reverse ? 1 : 0]);
      tables[secondTable].push(group[reverse ? 0 : 1]);
    });
    if (tables.some((table, index) => table.length > sizes[index])) continue;
    const topIds = new Set(topGroups.flat());
    const chasersByRank = [3, 4, 5].flatMap(rank => shuffle(data.participants.filter(person => !topIds.has(person.id) && sourceRanks[person.id] === rank).map(person => person.id), random));
    const fillerSlots = sizes.slice(0, topTableCount).reduce((sum, size, index) => sum + Math.max(0, size - tables[index].length), 0);
    assign(chasersByRank.slice(0, fillerSlots), tables, Array.from({ length: topTableCount }, (_, index) => index));
    const lowerTables = Array.from({ length: tableCount - topTableCount }, (_, index) => index + topTableCount);
    assign(chasersByRank.slice(fillerSlots), tables, lowerTables.length ? lowerTables : Array.from({ length: topTableCount }, (_, index) => index));
    const candidate: Draw = { number, locked: false, tables, revision: (data.draws.find(draw => draw.number === number)?.revision ?? 0) + 1, generation: "tier", tier };
    const review = reviewTierDraw(data, candidate);
    if (review && review.penalty < bestPenalty) { best = candidate; bestPenalty = review.penalty; }
    if (review?.topPairRematches === 0 && review.mixedTables === 0 && review.chaserGroupRematches === 0 && review.sameCommunity === 0) break;
  }
  if (!best) throw new RuleError("Belum berhasil membuat Shuffle Tier yang valid. Coba kembali atau gunakan Shuffle Rotasi.");
  validateDraw(data, best);
  return best;
}

export function generateSeededDraw(data: EventData, number: number, random = Math.random): Draw {
  if (!data.parentId) throw new RuleError("Pembagian berdasarkan peringkat hanya tersedia untuk tahap lanjutan.");
  if (number < 1 || number > data.settings.rounds) throw new RuleError("Nomor babak tidak valid.");
  if (data.participants.length !== data.settings.target) throw new RuleError("Lengkapi peserta sesuai target terlebih dahulu.");
  if (data.draws.some(draw => draw.number === number && draw.locked)) throw new RuleError("Pembagian ini sudah dikunci.");
  const previous = data.draws.filter(draw => draw.number < number && draw.locked);
  if (previous.length !== number - 1) throw new RuleError("Kunci pembagian babak sebelumnya terlebih dahulu.");
  const tableCount = Math.ceil(data.participants.length / data.settings.capacity);
  const sizes = Array.from({ length: tableCount }, (_, index) => Math.floor(data.participants.length / tableCount) + (index < data.participants.length % tableCount ? 1 : 0));
  const seeded = [...data.participants].sort((first, second) => first.number - second.number);
  const pots = Array.from({ length: Math.ceil(seeded.length / tableCount) }, (_, index) => seeded.slice(index * tableCount, (index + 1) * tableCount));
  let best: string[][] = [];
  let bestPenalty = Infinity;
  for (let attempt = 0; attempt < 64; attempt++) {
    const tables: string[][] = sizes.map(() => []);
    pots.forEach((pot, potIndex) => {
      let destinations = Array.from({ length: tableCount }, (_, index) => index).filter(index => tables[index].length < sizes[index]);
      if (attempt === 0 && potIndex % 2 === 1) destinations.reverse();
      else if (attempt > 0) destinations = shuffle(destinations, random);
      pot.forEach((person, index) => tables[destinations[index]].push(person.id));
    });
    const seedSums = tables.map(table => table.reduce((sum, id) => sum + (data.participants.find(person => person.id === id)?.number ?? 0), 0));
    const average = seedSums.reduce((sum, value) => sum + value, 0) / seedSums.length;
    const balancePenalty = seedSums.reduce((sum, value) => sum + (value - average) ** 2, 0);
    const penalty = reviewDraw(tables, data.participants, previous).penalty + balancePenalty * 5;
    if (penalty < bestPenalty) { best = tables.map(table => [...table]); bestPenalty = penalty; }
  }
  return { number, locked: false, tables: best, revision: (data.draws.find(draw => draw.number === number)?.revision ?? 0) + 1, generation: "seeded" };
}

export function validateDraw(data: EventData, draw: Draw) {
  const ids = draw.tables.flat();
  const roster = new Set(data.participants.map(person => person.id));
  const tableSizes = draw.tables.map(table => table.length);
  const unbalanced = tableSizes.length > 0 && Math.max(...tableSizes) - Math.min(...tableSizes) > 1;
  if (ids.length !== roster.size || new Set(ids).size !== roster.size || ids.some(id => !roster.has(id)) || draw.tables.some(table => table.length < 1 || table.length > Math.min(5, data.settings.capacity)) || unbalanced) throw new RuleError("Pembagian tidak valid: setiap peserta harus muncul tepat satu kali, meja maksimal lima orang, dan jumlah pemain harus merata.");
}

export function unlockDraw(data: EventData, number: number) {
  if (data.results.some(result => result.round >= number)) throw new RuleError("Hapus hasil skor babak ini dan sesudahnya sebelum membuka pembagian.");
  if (data.draws.some(draw => draw.number > number && draw.locked)) throw new RuleError("Buka kunci dari babak terakhir terlebih dahulu agar rotasi tetap konsisten.");
  const draw = data.draws.find(item => item.number === number);
  if (!draw) throw new RuleError("Pembagian tidak ditemukan.");
  draw.locked = false;
  data.draws = data.draws.filter(item => item.number <= number);
}

export function swapDraw(data: EventData, number: number, first: string, second: string) {
  const draw = data.draws.find(item => item.number === number);
  if (!draw || draw.locked) throw new RuleError("Pertukaran hanya tersedia pada pembagian draft.");
  if (first === second || !draw.tables.flat().includes(first) || !draw.tables.flat().includes(second)) throw new RuleError("Pilih dua peserta berbeda dari babak ini.");
  draw.tables = draw.tables.map(table => table.map(id => id === first ? second : id === second ? first : id));
  draw.revision++;
  validateDraw(data, draw);
}
