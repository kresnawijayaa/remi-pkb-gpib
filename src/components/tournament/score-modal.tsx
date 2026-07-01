"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MatchTable, TablePlayer } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScoreModal({
  table,
  players,
  disabled,
}: {
  table: MatchTable;
  players: TablePlayer[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitScores(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const scores = players.map((player) => ({
      tablePlayerId: player.id,
      participantId: player.participantId,
      score: Number(formData.get(`score-${player.id}`)),
    }));

    const response = await fetch(`/api/tables/${table.id}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tournamentId: table.tournamentId,
        roundId: table.roundId,
        scores,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Gagal mengirim hasil meja.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" className="mt-2" disabled={disabled} onClick={() => setOpen(true)}>
        Input Skor
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border p-4">
              <div>
                <div className="text-xl font-semibold">{table.tableName ?? `Meja ${table.tableNumber}`}</div>
                <div className="mt-1 text-sm text-muted-foreground">Masukkan skor akhir. Rank meja dihitung otomatis.</div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Tutup
              </Button>
            </div>

            <form onSubmit={submitScores} className="grid gap-4 p-4">
              <input type="hidden" name="tournamentId" value={table.tournamentId} />
              <input type="hidden" name="roundId" value={table.roundId} />
              <input type="hidden" name="tableId" value={table.id} />
              {error && (
                <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  {error}
                </div>
              )}
              {players.map((player) => (
                <div key={player.id} className="grid gap-3 border border-border p-3 md:grid-cols-[1fr_160px] md:items-end">
                  <input type="hidden" name="tablePlayerId" value={player.id} />
                  <input type="hidden" name={`participantId-${player.id}`} value={player.participantId} />
                  <div>
                    <div className="font-semibold">{player.participantName}</div>
                    <div className="text-sm text-muted-foreground">No {player.participantNumber} / {player.communityName ?? "-"}</div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Skor</Label>
                    <Input name={`score-${player.id}`} type="number" defaultValue={player.score ?? ""} required />
                  </div>
                </div>
              ))}
              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Mengirim hasil..." : "Kirim Hasil Meja"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
