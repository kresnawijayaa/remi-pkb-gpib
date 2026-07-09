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
  const lower = standings.slice(10, 35);

  if (upper.length < 10 || lower.length < 25) {
    throw new Error("Exhibition membutuhkan minimal 35 peserta dengan skor penyisihan lengkap.");
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

  const lowerTables = Array.from({ length: 5 }, (_, index) => ({
    tableNumber: index + 3,
    tableName: `Semi Bawah ${index + 1}`,
    players: [] as ReturnType<typeof toPlayer>[],
  }));

  lower.forEach((player, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const tableIndex = row % 2 === 0 ? column : 4 - column;
    lowerTables[tableIndex].players.push(toPlayer(player));
  });

  return [...upperTables, ...lowerTables];
}

export function generateExhibitionFinalTables({
  upperSemifinalStandings,
  lowerWinners,
}: {
  upperSemifinalStandings: StandingRow[];
  lowerWinners: StandingRow[];
}) {
  const upperFinalists = upperSemifinalStandings.slice(0, 5);
  const lowerFinalists = lowerWinners.slice(0, 5);

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
