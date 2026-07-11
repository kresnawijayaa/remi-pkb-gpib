import type { StandingRow } from "@/types/tournament";

export function generateFinalTables(finalists: StandingRow[]) {
  if (finalists.length < 10) {
    throw new Error("Final membutuhkan 10 finalis.");
  }

  return [
    {
      tableNumber: 1,
      tableName: "Final A",
      players: [finalists[0], finalists[3], finalists[4], finalists[7], finalists[8]],
    },
    {
      tableNumber: 2,
      tableName: "Final B",
      players: [finalists[1], finalists[2], finalists[5], finalists[6], finalists[9]],
    },
  ];
}

function toPlayer(row: StandingRow) {
  return {
    id: row.participantId,
    name: row.name,
    communityId: null,
  };
}

export function generateExhibitionSemifinalTables(standings: StandingRow[]) {
  const upper = standings.slice(0, 10);
  const lower = standings.slice(10, 20);

  if (upper.length < 10 || lower.length < 10) {
    throw new Error("Exhibition membutuhkan minimal 20 peserta dengan skor penyisihan lengkap.");
  }

  const upperTables = [
    {
      tableNumber: 1,
      tableName: "Semi Atas A",
      players: [upper[0], upper[3], upper[4], upper[7], upper[8]].map(toPlayer),
    },
    {
      tableNumber: 2,
      tableName: "Semi Atas B",
      players: [upper[1], upper[2], upper[5], upper[6], upper[9]].map(toPlayer),
    },
  ];

  const lowerTables = [
    {
      tableNumber: 3,
      tableName: "Semi Bawah A",
      players: [lower[0], lower[3], lower[4], lower[7], lower[8]].map(toPlayer),
    },
    {
      tableNumber: 4,
      tableName: "Semi Bawah B",
      players: [lower[1], lower[2], lower[5], lower[6], lower[9]].map(toPlayer),
    },
  ];

  return [...upperTables, ...lowerTables];
}

export function generateExhibitionFinalTables({
  upperSemifinalStandings,
  lowerSemifinalStandings,
}: {
  upperSemifinalStandings: StandingRow[];
  lowerSemifinalStandings: StandingRow[];
}) {
  const upperFinalists = upperSemifinalStandings.slice(0, 5);
  const lowerFinalists = lowerSemifinalStandings.slice(0, 5);

  if (upperFinalists.length < 5 || lowerFinalists.length < 5) {
    throw new Error("Data semifinal belum cukup untuk membuat final exhibition.");
  }

  return [
    {
      tableNumber: 1,
      tableName: "Final Papan Atas",
      players: upperFinalists.map(toPlayer),
    },
    {
      tableNumber: 2,
      tableName: "Final Papan Bawah",
      players: lowerFinalists.map(toPlayer),
    },
  ];
}
