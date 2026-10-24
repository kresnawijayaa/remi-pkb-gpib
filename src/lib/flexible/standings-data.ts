import { communityName, type EventData } from "./model";
import { calculateStandings, expectedTableCount } from "./scoring";

// Shared projection keeps the public page and both PDF routes on the same rules.
export function standingsSnapshot(data: EventData, updatedAt = "") {
  const people = new Map(data.participants.map(person => [person.id, person]));
  const history = new Map<string, { round: number; table: number; score: number; tableRank: number; points: number }[]>();
  for (const result of data.results) for (const score of result.scores) {
    const rounds = history.get(score.participantId) ?? [];
    rounds.push({ round: result.round, table: result.table, score: score.score, tableRank: score.tableRank, points: score.tournamentPoint });
    history.set(score.participantId, rounds);
  }
  const standings = calculateStandings(data).map((row, index) => {
    const person = people.get(row.participantId);
    return { rank: index + 1, number: person?.number ?? 0, name: person?.name ?? "Peserta tidak ditemukan", community: person ? communityName(data, person) : "", played: row.completedRounds, firsts: row.firsts, seconds: row.seconds, thirds: row.thirds, points: row.totalPoint, totalScore: row.totalScore, history: (history.get(row.participantId) ?? []).sort((first, second) => first.round - second.round) };
  });
  return { name: data.settings.name, rounds: data.settings.rounds, completedTables: data.results.length, expectedTables: expectedTableCount(data), final: Boolean(data.qualificationLockedAt), standings, updatedAt };
}

export type StandingsSnapshot = ReturnType<typeof standingsSnapshot>;
