import type { StandingRow, TablePlayer } from "@/types/tournament";

export function calculateStandings(rows: TablePlayer[]): StandingRow[] {
  const map = new Map<string, StandingRow>();

  for (const row of rows) {
    if (row.score === null || row.tableRank === null || row.tournamentPoint === null) {
      continue;
    }

    const current =
      map.get(row.participantId) ??
      ({
        participantId: row.participantId,
        participantNumber: row.participantNumber,
        name: row.participantName,
        communityName: row.communityName,
        totalPoint: 0,
        totalScore: 0,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
        rounds: {},
      } satisfies StandingRow);

    current.totalPoint += row.tournamentPoint;
    current.totalScore += row.score;
    if (row.tableRank === 1) current.firstPlaceCount += 1;
    if (row.tableRank === 2) current.secondPlaceCount += 1;
    if (row.tableRank === 3) current.thirdPlaceCount += 1;
    current.rounds[row.roundNumber ?? Object.keys(current.rounds).length + 1] = {
      score: row.score,
      tableRank: row.tableRank,
      tournamentPoint: row.tournamentPoint,
    };

    map.set(row.participantId, current);
  }

  return [...map.values()].sort((a, b) => {
    if (a.totalPoint !== b.totalPoint) return a.totalPoint - b.totalPoint;
    if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
    if (a.firstPlaceCount !== b.firstPlaceCount) return b.firstPlaceCount - a.firstPlaceCount;
    if (a.secondPlaceCount !== b.secondPlaceCount) return b.secondPlaceCount - a.secondPlaceCount;
    if (a.thirdPlaceCount !== b.thirdPlaceCount) return b.thirdPlaceCount - a.thirdPlaceCount;
    return a.participantNumber - b.participantNumber;
  });
}
