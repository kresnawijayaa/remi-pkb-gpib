"use client";

import { useRouter } from "next/navigation";

type ViewerRoundOption = {
  id: string;
  label: string;
  status: string;
};

export function ViewerRoundSelect({
  tournamentId,
  selectedRoundId,
  rounds,
}: {
  tournamentId: string;
  selectedRoundId: string | null;
  rounds: ViewerRoundOption[];
}) {
  const router = useRouter();

  return (
    <select
      value={selectedRoundId ?? ""}
      onChange={(event) => {
        const value = event.currentTarget.value;
        router.push(value ? `/tournaments/${tournamentId}/viewer?roundId=${value}` : `/tournaments/${tournamentId}/viewer`);
      }}
      className="border border-background/20 bg-foreground px-2 py-1.5 text-sm font-semibold text-background"
    >
      {rounds.length === 0 ? (
        <option value="">Belum ada babak</option>
      ) : (
        rounds.map((round) => (
          <option key={round.id} value={round.id}>
            {round.label} / {round.status}
          </option>
        ))
      )}
    </select>
  );
}
