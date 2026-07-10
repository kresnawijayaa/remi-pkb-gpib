import Link from "next/link";
import {
  activateRoundAction,
  generateFinalAction,
  generateRoundAction,
  lockRoundAction,
  reshuffleDraftRoundAction,
  swapParticipantsAction,
} from "@/app/actions";
import { getRound, getRounds, getTables, getTablePlayersByRound, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import type { RotationWarningSummary } from "@/types/tournament";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreModal } from "@/components/tournament/score-modal";
import { DevTestingMenu } from "@/components/tournament/dev-testing-menu";

export const dynamic = "force-dynamic";

export default async function RoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
  searchParams: Promise<{ error?: string; missing?: string }>;
}) {
  await requireAuth();
  const { tournamentId, roundId } = await params;
  const query = await searchParams;
  const [tournament, round, rounds, tables, players] = await Promise.all([
    getTournament(tournamentId),
    getRound(roundId),
    getRounds(tournamentId),
    getTables(roundId),
    getTablePlayersByRound(roundId),
  ]);

  if (!tournament || !round) return <main className="p-8">Babak tidak ditemukan.</main>;
  const roundLabel = round.roundType === "semifinal" ? "Semi Final" : `Babak ${round.roundNumber}`;
  const qualificationRounds = rounds.filter((item) => item.roundType === "qualification");
  const lockedQualificationCount = qualificationRounds.filter((item) => item.status === "locked").length;
  const qualificationRoundTarget = tournament.isExhibition ? 3 : tournament.qualificationRoundCount;
  const semifinalRound = rounds.find((item) => item.roundType === "semifinal");
  const hasFinalRound = rounds.some((item) => item.roundType === "final");
  const lastQualificationRound = qualificationRounds.at(-1);
  const shouldShowNextQualificationStep = qualificationRounds.length < qualificationRoundTarget;
  const canCreateNextQualification =
    shouldShowNextQualificationStep &&
    (!lastQualificationRound || lastQualificationRound.status !== "draft");
  const finalStepLabel = tournament.isExhibition && !semifinalRound ? "Generate Semi Final" : "Generate Final";
  const canGenerateFinalStep = tournament.isExhibition
    ? lockedQualificationCount >= qualificationRoundTarget &&
      (!semifinalRound || (semifinalRound.status === "locked" && !hasFinalRound))
    : lockedQualificationCount >= qualificationRoundTarget && !hasFinalRound;
  const isQualificationRound = round.roundType === "qualification";
  const rotationWarnings = normalizeRotationWarnings(round.rotationWarnings);
  const warningsByTable = rotationWarnings.reduce<Record<number, RotationWarningSummary[]>>((map, warning) => {
    map[warning.tableNumber] = [...(map[warning.tableNumber] ?? []), warning];
    return map;
  }, {});
  const qualityTone = getQualityTone(round.rotationQuality);
  const tableCompletion = tables.map((table) => {
    const tablePlayers = players.filter((player) => player.tableId === table.id);
    const missingScoreCount = tablePlayers.filter(
      (player) => player.score === null || player.tableRank === null || player.tournamentPoint === null
    ).length;
    const isSubmitted = table.status === "submitted" || table.status === "locked";

    return {
      table,
      playerCount: tablePlayers.length,
      missingScoreCount,
      isComplete: isSubmitted && missingScoreCount === 0,
      reason: !isSubmitted ? "Belum submit" : missingScoreCount > 0 ? `${missingScoreCount} skor belum lengkap` : "Lengkap",
    };
  });
  const incompleteTables = tableCompletion.filter((item) => !item.isComplete);
  const canLockRound = round.status !== "locked" && incompleteTables.length === 0;
  const canInputScore = round.status === "active";
  const canEditDraft = round.status === "draft";
  const playersByTableOrder = players
    .map((player) => ({
      player,
      tableNumber: tables.find((table) => table.id === player.tableId)?.tableNumber ?? 999,
    }))
    .sort((a, b) => a.tableNumber - b.tableNumber || a.player.seatNumber - b.player.seatNumber);

  return (
    <main className="app-container grid gap-8 py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-primary">&larr; Dashboard</Link>
          <h1 className="mt-3 text-4xl font-semibold">{roundLabel}</h1>
          <div className="mt-2 flex gap-2"><Badge>{round.status}</Badge></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {round.status === "draft" && (
            <form action={activateRoundAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input type="hidden" name="roundId" value={roundId} />
              <SubmitButton pendingText="Mengaktifkan...">Aktifkan {round.roundType === "semifinal" ? "Semi Final" : "Babak"}</SubmitButton>
            </form>
          )}
          {round.status !== "locked" && (
            <form action={lockRoundAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input type="hidden" name="roundId" value={roundId} />
              <SubmitButton variant="outline" disabled={!canLockRound} pendingText="Mengunci...">Kunci {round.roundType === "semifinal" ? "Semi Final" : "Babak"}</SubmitButton>
            </form>
          )}
        </div>
      </header>

      {query.error === "round-incomplete" && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Babak belum bisa dikunci. Masih ada {query.missing ?? "beberapa"} data skor atau meja yang belum lengkap.
        </div>
      )}

      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {rounds.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              {index > 0 && <div className="h-px w-8 bg-border" />}
              <Link
                href={item.roundType === "final" ? `/tournaments/${tournamentId}/final` : `/tournaments/${tournamentId}/rounds/${item.id}`}
                className={[
                  "grid gap-0.5 text-sm font-semibold underline-offset-4 transition hover:underline active:translate-y-px",
                  item.id === roundId ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <span>{getRoundLabel(item)}</span>
                <span className="text-[11px] font-medium uppercase leading-none text-muted-foreground">
                  {item.status}
                </span>
              </Link>
            </div>
          ))}
          {rounds.length > 0 && <div className="h-px w-8 bg-border" />}
          {shouldShowNextQualificationStep ? (
            <form action={generateRoundAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <SubmitButton
                variant="outline"
                disabled={!canCreateNextQualification}
                pendingText="Membuat..."
                title={!canCreateNextQualification ? "Aktifkan babak draft sebelumnya dulu." : undefined}
              >
                Buat Babak {qualificationRounds.length + 1}
              </SubmitButton>
            </form>
          ) : (
            <form action={generateFinalAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <SubmitButton variant="outline" disabled={!canGenerateFinalStep} pendingText="Membuat...">
                {finalStepLabel}
              </SubmitButton>
            </form>
          )}
        </div>
      </section>

      {round.status !== "locked" && (
        <Card>
          <CardHeader><CardTitle>Status input hasil</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">Meja selesai</div>
                <div className="mt-1 text-2xl font-semibold">{tables.length - incompleteTables.length}/{tables.length}</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">Belum lengkap</div>
                <div className="mt-1 text-2xl font-semibold">{incompleteTables.length}</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">Kunci babak</div>
                <div className="mt-1 text-2xl font-semibold">{canLockRound ? "Siap" : "Belum siap"}</div>
              </div>
            </div>

            {tableCompletion.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {tableCompletion.map(({ table, isComplete }) => (
                  <div
                    key={table.id}
                    className={[
                      "min-w-0 border bg-muted px-3 py-2 text-sm",
                      isComplete ? "border-emerald-200" : "border-red-200",
                    ].join(" ")}
                  >
                    <span className="font-semibold">{table.tableName ?? `Meja ${table.tableNumber}`}</span> / {isComplete ? "Sudah submit" : "Belum submit"}
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {canEditDraft && isQualificationRound && (
        <section className="grid gap-4 xl:grid-cols-[3fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-4">
              <div>
                <CardTitle>Review rotasi</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Penalty semakin kecil berarti susunan meja semakin baik.
                </p>
              </div>
              <Badge tone={qualityTone}>{round.rotationQuality ?? "BELUM ADA"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="border border-border bg-background p-3">
                  <div className="text-sm text-muted-foreground">Total penalty</div>
                  <div className="mt-1 text-xl font-semibold">{round.rotationPenalty ?? 0}</div>
                </div>
                <div className="border border-border bg-background p-3">
                  <div className="text-sm text-muted-foreground">Peringatan</div>
                  <div className="mt-1 text-xl font-semibold">{rotationWarnings.length}</div>
                </div>
                <div className="border border-border bg-background p-3">
                  <div className="text-sm text-muted-foreground">Status draft</div>
                  <div className="mt-1 text-xl font-semibold">Bisa diubah</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={reshuffleDraftRoundAction}>
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="roundId" value={roundId} />
                  <SubmitButton variant="secondary" pendingText="Mengacak ulang...">Shuffle Ulang Draft</SubmitButton>
                </form>
                <p className="self-center text-sm text-muted-foreground">
                  Shuffle dan koreksi manual hanya tersedia saat babak masih draft.
                </p>
              </div>

              {rotationWarnings.length > 0 ? (
                <div className="grid gap-2">
                  {rotationWarnings.map((warning, index) => (
                    <div key={`${warning.type}-${warning.tableNumber}-${index}`} className="rounded-sm border border-border bg-muted p-3 text-sm">
                      <span className="font-semibold">Meja {warning.tableNumber}.</span> {warning.message}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada peringatan rotasi.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4"><CardTitle>Koreksi manual</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <form action={swapParticipantsAction} className="grid gap-3">
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="roundId" value={roundId} />
                <select name="firstTablePlayerId" className="h-10 rounded-sm border border-input bg-background px-3">
                  {playersByTableOrder.map(({ player, tableNumber }) => (
                    <option key={player.id} value={player.id}>Meja {tableNumber} / Seat {player.seatNumber} / {player.participantName}</option>
                  ))}
                </select>
                <select name="secondTablePlayerId" className="h-10 rounded-sm border border-input bg-background px-3">
                  {playersByTableOrder.map(({ player, tableNumber }) => (
                    <option key={player.id} value={player.id}>Meja {tableNumber} / Seat {player.seatNumber} / {player.participantName}</option>
                  ))}
                </select>
                <SubmitButton variant="secondary" pendingText="Menukar...">Tukar</SubmitButton>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tables.map((table) => {
          const tablePlayers = players.filter((player) => player.tableId === table.id).sort((a, b) => a.seatNumber - b.seatNumber);
          return (
            <Card key={table.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-3">
                <CardTitle className="text-base">{table.tableName ?? `Meja ${table.tableNumber}`}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 pt-0">
                {tablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={[
                      "grid grid-cols-[24px_1fr_auto] items-center gap-2 border px-2 py-2 text-sm",
                      player.score === null || player.tableRank === null
                        ? "border-border border-l-2 border-l-amber-300 bg-background text-foreground"
                        : "border-border bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    <div className="font-semibold">{player.seatNumber}</div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{player.participantName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {player.communityName ?? "-"}
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold">{player.score ?? ""}</div>
                  </div>
                ))}
                {(warningsByTable[table.tableNumber] ?? []).length > 0 && (
                  <div className="grid gap-2 border-t border-border pt-3">
                    {(warningsByTable[table.tableNumber] ?? []).map((warning, index) => (
                      <p key={`${warning.type}-${index}`} className="text-sm text-muted-foreground">
                        {warning.message}
                      </p>
                    ))}
                  </div>
                )}
                <ScoreModal table={table} players={tablePlayers} disabled={!canInputScore} />
                {!canInputScore && (
                  <p className="text-xs text-muted-foreground">Aktifkan babak dulu untuk input skor.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
      <DevTestingMenu
        tournamentId={tournamentId}
        roundId={roundId}
        actions={[
          {
            kind: "roundScores",
            label: "Isi skor babak",
            description: "Skor random untuk semua meja babak ini.",
            disabled: round.status === "locked",
            disabledReason: "Babak sudah dikunci.",
          },
        ]}
      />
    </main>
  );
}

function normalizeRotationWarnings(input: unknown): RotationWarningSummary[] {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value.filter((item): item is RotationWarningSummary => {
    return (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      "tableNumber" in item &&
      "message" in item
    );
  });
}

function getQualityTone(quality: string | null) {
  if (quality === "EXCELLENT" || quality === "GOOD") return "good";
  if (quality === "FAIR") return "warn";
  if (quality === "NEED_REVIEW") return "danger";
  return "neutral";
}

function getRoundLabel(round: { roundType: string; roundNumber: number }) {
  if (round.roundType === "final") return "Final";
  if (round.roundType === "semifinal") return "Semi Final";
  return `Babak ${round.roundNumber}`;
}
