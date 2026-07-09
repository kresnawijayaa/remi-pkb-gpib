import type { StandingRow, TablePlayer } from "@/types/tournament";

export type FinalResultRow = {
  participantId: string;
  name: string;
  communityName: string | null;
  tableName: string;
  tableRank: number;
  score: number;
  qualificationRank: number;
  qualificationPoint: number;
  qualificationScore: number;
  position: number;
  boardName?: string;
};

export function calculateFinalResults(
  players: TablePlayer[],
  qualificationRankMap: Map<string, number>,
  qualificationRowMap: Map<string, StandingRow>,
  tableNameMap: Map<string, string>
): FinalResultRow[] {
  const scoredPlayers = players.filter((player) => player.score !== null && player.tableRank !== null);

  return scoredPlayers
    .map((player) => ({
      participantId: player.participantId,
      name: player.participantName,
      communityName: player.communityName,
      tableName: tableNameMap.get(player.tableId) ?? "Meja Final",
      tableRank: player.tableRank ?? 999,
      score: player.score ?? 0,
      qualificationRank: qualificationRankMap.get(player.participantId) ?? 999,
      qualificationPoint: qualificationRowMap.get(player.participantId)?.totalPoint ?? 999,
      qualificationScore: qualificationRowMap.get(player.participantId)?.totalScore ?? -999999,
    }))
    .sort((a, b) => {
      if (a.tableRank !== b.tableRank) return a.tableRank - b.tableRank;
      if (a.score !== b.score) return b.score - a.score;
      if (a.qualificationPoint !== b.qualificationPoint) return a.qualificationPoint - b.qualificationPoint;
      if (a.qualificationScore !== b.qualificationScore) return b.qualificationScore - a.qualificationScore;
      return a.qualificationRank - b.qualificationRank;
    })
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }));
}

export function calculateExhibitionFinalResults(players: TablePlayer[], tableNameMap: Map<string, string>): FinalResultRow[] {
  return players
    .filter((player) => player.score !== null && player.tableRank !== null && player.tableRank <= 3)
    .map((player) => {
      const tableName = tableNameMap.get(player.tableId) ?? "Final";
      return {
        participantId: player.participantId,
        name: player.participantName,
        communityName: player.communityName,
        tableName,
        tableRank: player.tableRank ?? 999,
        score: player.score ?? 0,
        qualificationRank: 0,
        qualificationPoint: 0,
        qualificationScore: 0,
        position: player.tableRank ?? 999,
        boardName: tableName.replace(/^Final\s*/i, "") || tableName,
      };
    })
    .sort((a, b) => {
      if (a.tableName !== b.tableName) return a.tableName.localeCompare(b.tableName);
      if (a.tableRank !== b.tableRank) return a.tableRank - b.tableRank;
      return b.score - a.score;
    });
}
