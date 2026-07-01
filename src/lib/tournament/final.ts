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
