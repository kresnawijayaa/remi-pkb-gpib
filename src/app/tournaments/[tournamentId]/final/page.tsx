import Link from "next/link";
import { activateRoundAction, lockFinalAction, swapParticipantsAction } from "@/app/actions";
import { getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
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
  const [tables, players] = finalRound
    ? await Promise.all([getTables(finalRound.id), getTablePlayersByRound(finalRound.id)])
    : [[], []];
  const tableNumberById = new Map(tables.map((table) => [table.id, table.tableNumber]));
  const qualificationStandings = calculateStandings(qualificationRows);
  const qualificationRankMap = new Map(qualificationStandings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(qualificationStandings.map((row) => [row.participantId, row]));
  const playersByTableId = new Map(
    tables.map((table) => [
      table.id,
      players.filter((player) => player.tableId === table.id).sort((a, b) => a.seatNumber - b.seatNumber),
    ])
  );
  const finalCompletion = tables.map((table) => {
    const tablePlayers = playersByTableId.get(table.id) ?? [];
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
      tableNumber: tableNumberById.get(player.tableId) ?? 999,
    }))
    .sort((a, b) => a.tableNumber - b.tableNumber || a.player.seatNumber - b.player.seatNumber);

  return (
    <main className="app-container grid h-[100dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden py-3">
      <header className="border-b border-border pb-3">
        <Link href={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-primary">&larr; Dashboard</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-4xl font-semibold">Final</h1>
          <div className="text-sm text-muted-foreground">
            {finalRound ? `Fokus: ${finalRound.status === "locked" ? "Final terkunci" : finalRound.status === "active" ? "Final berjalan" : "Final draft"}` : "Final belum dibuat"}
          </div>
        </div>
      </header>

      {!finalRound ? (
        <div className="rounded-sm border border-dashed border-border bg-background p-6 text-muted-foreground">
          {tournament.isExhibition
            ? "Final belum dibuat. Kunci semi final, lalu klik Generate Final dari dashboard permainan."
            : `Final belum dibuat. Kunci ${tournament.qualificationRoundCount} babak penyisihan, lalu klik Generate Final dari dashboard permainan.`}
        </div>
      ) : (
        <div className="grid min-h-0 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          {query.error === "final-incomplete" && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 xl:col-span-2">
              Final belum bisa dikunci. Masih ada {query.missing ?? "beberapa"} data skor atau meja yang belum lengkap.
            </div>
          )}

          <div className="grid min-h-0 gap-3">
            <section className="grid min-h-0 gap-3 md:grid-cols-2">
              {tables.map((table) => (
                <Card key={table.id} className="min-h-0">
                  <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <CardTitle>{table.tableName}</CardTitle>
                    <Badge>{finalRound.status}</Badge>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-4 pb-4">
                    {(playersByTableId.get(table.id) ?? []).map((player) => {
                      const qualificationRank = qualificationRankMap.get(player.participantId);
                      const qualificationRow = qualificationRowMap.get(player.participantId);

                      return (
                        <div key={player.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-2 rounded-sm bg-muted px-3 py-2">
                          <div className="font-semibold">{player.seatNumber}</div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{player.participantName}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {player.communityName ?? "-"} / Rank penyisihan {qualificationRank ?? "-"} / {qualificationRow?.totalPoint ?? "-"} poin
                            </div>
                          </div>
                          <div className="text-right font-semibold">
                            {player.tableRank ? `R${player.tableRank}` : ""}
                            {player.score !== null && <div className="text-xs font-normal text-muted-foreground">{player.score}</div>}
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
                      players={playersByTableId.get(table.id) ?? []}
                      disabled={!canInputFinalScore}
                    />
                    {!canInputFinalScore && <p className="text-xs text-muted-foreground">Mulai final dulu untuk input skor.</p>}
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>

          <aside className="grid min-h-0 content-start gap-3">
            <Card className="min-h-0">
              <CardHeader className="p-4 pb-2"><CardTitle>Status final</CardTitle></CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-sm border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Meja selesai</div>
                    <div className="mt-1 text-xl font-semibold">{tables.length - incompleteFinalTables.length}/{tables.length}</div>
                  </div>
                  <div className="rounded-sm border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Status final</div>
                    <div className="mt-1 text-xl font-semibold">{finalRound.status}</div>
                  </div>
                  <div className="rounded-sm border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Selesaikan</div>
                    <div className="mt-1 text-xl font-semibold">{canLockFinal ? "Siap" : finalRound.status === "locked" ? "Selesai" : "Belum siap"}</div>
                  </div>
                </div>

                {incompleteFinalTables.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {incompleteFinalTables.map(({ table, reason }) => (
                      <div key={table.id} className="rounded-sm border border-border bg-muted p-2 text-sm">
                        <span className="font-semibold">{table.tableName ?? `Meja ${table.tableNumber}`}.</span> {reason}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
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
                </div>
              </CardContent>
            </Card>

            {canEditFinal && (
              <Card className="min-h-0">
                <CardHeader className="p-4 pb-2"><CardTitle>Koreksi posisi final</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4">
                  <form action={swapParticipantsAction} className="grid gap-2">
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
          </aside>
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

