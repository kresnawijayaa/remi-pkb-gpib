export type PlayerScore = {
  participantId: string;
  score: number;
  manualRank?: number | null;
};

export type RankingResult = {
  participantId: string;
  score: number;
  tableRank: number;
  tournamentPoint: number;
};

export function calculateTableRanking(scores: PlayerScore[]): {
  hasTie: boolean;
  rankings: RankingResult[];
} {
  const scoreCounts = new Map<number, number>();
  for (const item of scores) {
    scoreCounts.set(item.score, (scoreCounts.get(item.score) ?? 0) + 1);
  }

  const hasTie = [...scoreCounts.values()].some((count) => count > 1);
  const allManualRanksPresent = scores.every((item) => item.manualRank);

  const sorted = [...scores].sort((a, b) => {
    if (hasTie && allManualRanksPresent) {
      return (a.manualRank ?? 999) - (b.manualRank ?? 999);
    }

    if (b.score !== a.score) return b.score - a.score;
    return a.participantId.localeCompare(b.participantId);
  });

  return {
    hasTie,
    rankings: sorted.map((item, index) => ({
      participantId: item.participantId,
      score: item.score,
      tableRank: index + 1,
      tournamentPoint: index + 1,
    })),
  };
}
