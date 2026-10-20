// Frozen pre-optimization implementation for deterministic regression checks only.
import { RuleError, type Draw, type EventData, type Person } from "./model";

function pairKey(first: string, second: string) { return [first, second].sort().join(":"); }
function meetingMap(previous: Draw[]) {
  const meetings = new Map<string, number>();
  for (const draw of previous) for (const table of draw.tables) for (let first = 0; first < table.length; first++) for (let second = first + 1; second < table.length; second++) {
    const key = pairKey(table[first], table[second]);
    meetings.set(key, (meetings.get(key) ?? 0) + 1);
  }
  return meetings;
}

function referenceReviewDraw(tables: string[][], participants: Person[], previous: Draw[]) {
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

export function generateDrawReference(data: EventData, number: number, random = Math.random): Draw {
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
    let penalty = referenceReviewDraw(tables, data.participants, previous).penalty;
    for (let iteration = 0; iteration < Math.min(2000, data.participants.length * 8); iteration++) {
      const firstTable = Math.floor(random() * tables.length);
      let secondTable = Math.floor(random() * tables.length);
      if (firstTable === secondTable) secondTable = (secondTable + 1) % tables.length;
      const firstSeat = Math.floor(random() * tables[firstTable].length);
      const secondSeat = Math.floor(random() * tables[secondTable].length);
      [tables[firstTable][firstSeat], tables[secondTable][secondSeat]] = [tables[secondTable][secondSeat], tables[firstTable][firstSeat]];
      const candidate = referenceReviewDraw(tables, data.participants, previous).penalty;
      if (candidate <= penalty) penalty = candidate;
      else [tables[firstTable][firstSeat], tables[secondTable][secondSeat]] = [tables[secondTable][secondSeat], tables[firstTable][firstSeat]];
    }
    if (penalty < bestPenalty) { best = tables.map(table => [...table]); bestPenalty = penalty; }
    if (penalty === 0) break;
  }
  return { number, locked: false, tables: best, revision: (data.draws.find(draw => draw.number === number)?.revision ?? 0) + 1, generation: "random" };
}
