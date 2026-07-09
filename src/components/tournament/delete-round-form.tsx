"use client";

import { deleteRoundAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteRoundForm({
  tournamentId,
  roundId,
  label,
}: {
  tournamentId: string;
  roundId: string;
  label: string;
}) {
  return (
    <form
      action={deleteRoundAction}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus ${label}? Semua meja, skor, dan data terkait babak ini akan terhapus.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="roundId" value={roundId} />
      <SubmitButton variant="ghost" size="sm" pendingText="Menghapus...">
        Hapus
      </SubmitButton>
    </form>
  );
}
