import type { Tournament } from "@/types/tournament";

type QualificationRow = {
  roundNumber?: number | null;
};

export function getQualificationRoundTarget(tournament: Pick<Tournament, "isExhibition" | "qualificationRoundCount">) {
  return tournament.isExhibition ? 3 : tournament.qualificationRoundCount;
}

export function filterQualificationRowsForTournament<T extends QualificationRow>(
  rows: T[],
  tournament: Pick<Tournament, "isExhibition" | "qualificationRoundCount">
) {
  const target = getQualificationRoundTarget(tournament);
  return rows.filter((row) => Number(row.roundNumber ?? 0) <= target);
}
