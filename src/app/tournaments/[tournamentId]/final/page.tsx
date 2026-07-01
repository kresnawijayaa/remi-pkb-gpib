import Link from "next/link";
import { activateRoundAction, lockFinalAction, swapParticipantsAction } from "@/app/actions";
import { getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { calculateFinalResults } from "@/lib/tournament/final-results";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreModal } from "@/components/tournament/score-modal";
import { DevTestingMenu } from "@/components/tournament/dev-testing-menu";

export const dynamic = "force-dynamic";

export default async function FinalPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ error?: string; missing?: string }>;
}) {
  await requireAuth();
  const { tournamentId } = await params;
  const query = await searchParams;
  const [tournament, rounds, qualificationRows] = await Promise.all([
    getTournament(tournamentId),
    getRounds(tournamentId),
    getScoredQualificationPlayers(tournamentId),
  ]);
  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const finalRound = rounds.find((round) => round.roundType === "final");
  const tables = finalRound ? await getTables(finalRound.id) : [];
  const players = finalRound ? await getTablePlayersByRound(finalRound.id) : [];
  const tableNameMap = new Map(tables.map((table) => [table.id, table.tableName ?? `Meja ${table.tableNumber}`]));
  const qualificationStandings = calculateStandings(qualificationRows);
  const qualificationRankMap = new Map(qualificationStandings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(qualificationStandings.map((row) => [row.participantId, row]));
  const finalResults = calculateFinalResults(players, qualificationRankMap, qualificationRowMap, tableNameMap);
  const hasFinalScores = players.some((player) => player.score !== null);
  const finalCompletion = tables.map((table) => {
    const tablePlayers = players.filter((player) => player.tableId === table.id);
    const missingScoreCount = tablePlayers.filter(
      (player) => player.score === null || player.tableRank === null || player.tournamentPoint === null
    ).length;
    const isSubmitted = table.status === "submitted" || table.status === "locked";

    return {
      table,
      isComplete: isSubmitted && missingScoreCount === 0,
      reason: !isSubmitted ? "Belum submit" : missingScoreCount > 0 ? `${missingScoreCount} skor belum lengkap` : "Lengkap",
    };
  });
  const incompleteFinalTables = finalCompletion.filter((item) => !item.isComplete);
  const canEditFinal = finalRound?.status === "draft";
  const canInputFinalScore = finalRound?.status === "active";
  const canLockFinal = Boolean(finalRound) && finalRound?.status === "active" && incompleteFinalTables.length === 0;
  const playersByTableOrder = players
    .map((player) => ({
      player,
      tableNumber: tables.find((table) => table.id === player.tableId)?.tableNumber ?? 999,
    }))
    .sort((a, b) => a.tableNumber - b.tableNumber || a.player.seatNumber - b.player.seatNumber);

  return (
    <main className="app-container grid gap-8 py-8">
      <header className="border-b border-border pb-6">
        <Link href={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-primary">&larr; Dashboard</Link>
        <h1 className="mt-3 text-4xl font-semibold">Final</h1>
      </header>

      {!finalRound ? (
        <div className="rounded-sm border border-dashed border-border bg-background p-8 text-muted-foreground">
          Final belum dibuat. Kunci 4 babak penyisihan, lalu klik Generate Final dari dashboard.
        </div>
      ) : (
        <div className="grid gap-6">
          {query.error === "final-incomplete" && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Final belum bisa dikunci. Masih ada {query.missing ?? "beberapa"} data skor atau meja yang belum lengkap.
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Status final</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-sm border border-border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Meja selesai</div>
                  <div className="mt-1 text-2xl font-semibold">{tables.length - incompleteFinalTables.length}/{tables.length}</div>
                </div>
                <div className="rounded-sm border border-border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Status final</div>
                  <div className="mt-1 text-2xl font-semibold">{finalRound.status}</div>
                </div>
                <div className="rounded-sm border border-border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Selesaikan</div>
                  <div className="mt-1 text-2xl font-semibold">{canLockFinal ? "Siap" : finalRound.status === "locked" ? "Selesai" : "Belum siap"}</div>
                </div>
              </div>

              {incompleteFinalTables.length > 0 && (
                <div className="grid gap-2">
                  {incompleteFinalTables.map(({ table, reason }) => (
                    <div key={table.id} className="rounded-sm border border-border bg-muted p-3 text-sm">
                      <span className="font-semibold">{table.tableName ?? `Meja ${table.tableNumber}`}.</span> {reason}
                    </div>
                  ))}
                </div>
              )}

              <form action={lockFinalAction}>
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="roundId" value={finalRound.id} />
                <SubmitButton variant="outline" disabled={!canLockFinal} pendingText="Menyelesaikan final...">
                  Selesaikan Final
                </SubmitButton>
              </form>
              {canEditFinal && (
                <form action={activateRoundAction}>
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="roundId" value={finalRound.id} />
                  <SubmitButton pendingText="Memulai final...">Mulai Final</SubmitButton>
                </form>
              )}
            </CardContent>
          </Card>

          {canEditFinal && (
            <Card>
              <CardHeader><CardTitle>Koreksi posisi final</CardTitle></CardHeader>
              <CardContent>
                <form action={swapParticipantsAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="roundId" value={finalRound.id} />
                  <select name="firstTablePlayerId" className="h-10 rounded-sm border border-input bg-background px-3">
                    {playersByTableOrder.map(({ player, tableNumber }) => (
                      <option key={player.id} value={player.id}>Final {tableNumber} / Seat {player.seatNumber} / {player.participantName}</option>
                    ))}
                  </select>
                  <select name="secondTablePlayerId" className="h-10 rounded-sm border border-input bg-background px-3">
                    {playersByTableOrder.map(({ player, tableNumber }) => (
                      <option key={player.id} value={player.id}>Final {tableNumber} / Seat {player.seatNumber} / {player.participantName}</option>
                    ))}
                  </select>
                  <SubmitButton variant="secondary" pendingText="Menukar...">Tukar</SubmitButton>
                </form>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            {tables.map((table) => (
              <Card key={table.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>{table.tableName}</CardTitle>
                  <Badge>{finalRound.status}</Badge>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {players.filter((player) => player.tableId === table.id).sort((a, b) => a.seatNumber - b.seatNumber).map((player) => {
                    const qualificationRank = qualificationRankMap.get(player.participantId);
                    const qualificationRow = qualificationRowMap.get(player.participantId);

                    return (
                      <div key={player.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-2 rounded-sm bg-muted p-3">
                        <div className="font-semibold">{player.seatNumber}</div>
                        <div>
                          <div className="font-medium">{player.participantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.communityName ?? "-"} / Rank penyisihan {qualificationRank ?? "-"} / {qualificationRow?.totalPoint ?? "-"} poin
                          </div>
                        </div>
                        <div className="text-right font-semibold">
                          {player.tableRank ? `R${player.tableRank}` : ""}
                          {player.score !== null && <div className="text-sm font-normal text-muted-foreground">{player.score}</div>}
                        </div>
                      </div>
                    );
                  })}
                  {finalCompletion.find((item) => item.table.id === table.id)?.isComplete === false && finalRound.status !== "draft" && (
                    <div className="rounded-sm border border-border bg-background p-3 text-sm text-muted-foreground">
                      {finalCompletion.find((item) => item.table.id === table.id)?.reason}
                    </div>
                  )}
                  <ScoreModal
                    table={table}
                    players={players.filter((player) => player.tableId === table.id).sort((a, b) => a.seatNumber - b.seatNumber)}
                    disabled={!canInputFinalScore}
                  />
                  {!canInputFinalScore && (
                    <p className="text-sm text-muted-foreground">Mulai final dulu untuk input skor.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          {hasFinalScores && (
            <Card>
              <CardHeader>
                <CardTitle>{finalRound.status === "locked" ? "Hasil final" : "Hasil sementara final"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Juara ditentukan per pasangan rank meja: Rank 1 Final A/B untuk Juara 1-2, Rank 2 untuk Juara 3-4, dan seterusnya.
                </p>
              </CardHeader>
              <CardContent className="grid gap-2">
                {finalResults.map((row) => (
                  <div key={row.participantId} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-sm bg-muted p-3">
                    <div className="font-semibold">Juara {row.position}</div>
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {row.tableName} / Rank meja {row.tableRank} / Rank penyisihan {row.qualificationRank}
                      </div>
                    </div>
                    <div className="font-semibold">{row.score}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {finalRound && (
        <DevTestingMenu
          tournamentId={tournamentId}
          roundId={finalRound.id}
          actions={[
            {
              kind: "finalScores",
              label: "Isi skor final",
              description: "Skor random untuk semua meja final.",
              disabled: !canInputFinalScore,
              disabledReason: "Final harus dimulai dulu.",
            },
          ]}
        />
      )}
    </main>
  );
}

