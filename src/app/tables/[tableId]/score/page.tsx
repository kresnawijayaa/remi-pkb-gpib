import Link from "next/link";
import { submitScoresAction } from "@/app/actions";
import { getRound, getTable, getTablePlayersByTable } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function ScorePage({ params }: { params: Promise<{ tableId: string }> }) {
  await requireAuth();
  const { tableId } = await params;
  const table = await getTable(tableId);
  if (!table) return <main className="p-8">Meja tidak ditemukan.</main>;
  const [round, players] = await Promise.all([getRound(table.roundId), getTablePlayersByTable(tableId)]);
  if (!round) return <main className="p-8">Babak tidak ditemukan.</main>;

  return (
    <main className="app-container grid gap-8 py-8">
      <header className="border-b border-border pb-6">
        <Link href={`/tournaments/${table.tournamentId}/rounds/${table.roundId}`} className="text-sm font-semibold text-primary">&larr; Kembali ke babak</Link>
        <h1 className="mt-3 text-4xl font-semibold">{table.tableName ?? `Meja ${table.tableNumber}`}</h1>
        <p className="mt-2 text-muted-foreground">Masukkan total skor akhir. Rank meja dihitung otomatis.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Skor akhir</CardTitle></CardHeader>
        <CardContent>
          <form action={submitScoresAction} className="grid gap-4">
            <input type="hidden" name="tournamentId" value={table.tournamentId} />
            <input type="hidden" name="roundId" value={table.roundId} />
            <input type="hidden" name="tableId" value={table.id} />
            {players.map((player) => (
              <div key={player.id} className="grid gap-3 rounded-sm border border-border p-4 md:grid-cols-[1fr_160px] md:items-end">
                <input type="hidden" name="tablePlayerId" value={player.id} />
                <input type="hidden" name={`participantId-${player.id}`} value={player.participantId} />
                <div>
                  <div className="text-lg font-semibold">{player.participantName}</div>
                  <div className="text-sm text-muted-foreground">No {player.participantNumber} / {player.communityName ?? "-"}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Skor</Label>
                  <Input name={`score-${player.id}`} type="number" defaultValue={player.score ?? ""} required />
                </div>
              </div>
            ))}
            <SubmitButton size="lg" disabled={round.status === "locked"} pendingText="Mengirim hasil...">Kirim Hasil Meja</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
