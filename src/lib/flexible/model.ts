import { z } from "zod";

export const settingsSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(100),
  target: z.coerce.number().int().min(2).max(500),
  capacity: z.coerce.number().int().min(2).max(10),
  rounds: z.coerce.number().int().min(1).max(20),
  advancing: z.coerce.number().int().min(1).max(500),
}).refine(value => value.advancing <= value.target, { message: "Peserta lolos tidak boleh melebihi target peserta.", path: ["advancing"] });

export type Settings = z.infer<typeof settingsSchema>;
export type Community = { id: string; name: string; normalizedName: string };
export type Person = { id: string; number: number; name: string; communityId: string | null };
export type Draw = { number: number; locked: boolean; tables: string[][]; revision: number; generation?: "random" | "seeded" };
export type ScoreEntry = { participantId: string; score: number; tableRank: number; tournamentPoint: number };
export type TableResult = { round: number; table: number; submittedAt: string; scores: ScoreEntry[] };
export type EventData = { dataVersion: 2; settings: Settings; communities: Community[]; participants: Person[]; draws: Draw[]; results: TableResult[]; qualifiedIds: string[]; qualificationLockedAt: string | null; audit: { at: string; action: string }[]; parentId: string | null };
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
  return { dataVersion: 2, settings: source.settings as Settings, communities, participants, draws: source.draws ?? [], results, qualifiedIds: source.qualifiedIds ?? [], qualificationLockedAt: source.qualificationLockedAt ?? null, audit: source.audit ?? [], parentId: source.parentId ?? null };
}

export function communityName(data: EventData, person: Person) { return data.communities.find(item => item.id === person.communityId)?.name ?? ""; }

export function assertRosterEditable(data: EventData) {
  if (data.draws.some(draw => draw.locked)) throw new RuleError("Buka kunci pembagian terlebih dahulu sebelum mengubah peserta atau komunitas.");
}

export function assertScoreEditable(data: EventData) {
  if (data.qualificationLockedAt) throw new RuleError("Kelolosan sudah dikunci. Buka kunci kelolosan sebelum mengubah skor.");
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
  if (ids.length !== roster.size || new Set(ids).size !== roster.size || ids.some(id => !roster.has(id)) || draw.tables.some(table => table.length < 1 || table.length > data.settings.capacity)) throw new RuleError("Pembagian tidak valid: setiap peserta harus muncul tepat satu kali dan kapasitas meja harus sesuai.");
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
