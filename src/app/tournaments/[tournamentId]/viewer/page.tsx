import { getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { calculateExhibitionFinalResults, calculateFinalResults } from "@/lib/tournament/final-results";
import { ViewerBoard } from "@/components/tournament/viewer-board";

export const dynamic = "force-dynamic";

export default async function ViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ roundId?: string }>;
}) {
  await requireAuth();
  const { tournamentId } = await params;
  const query = await searchParams;
  const [tournament, rounds, scoredRows] = await Promise.all([getTournament(tournamentId), getRounds(tournamentId), getScoredQualificationPlayers(tournamentId)]);
  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const selectedRound = query.roundId ? rounds.find((round) => round.id === query.roundId) : null;
  const activeRound = selectedRound ?? rounds.find((round) => round.status === "active") ?? rounds.at(-1);
  const [tables, players] = activeRound
    ? await Promise.all([getTables(activeRound.id), getTablePlayersByRound(activeRound.id)])
    : [[], []];
  const scopedScoredRows =
    activeRound?.roundType === "qualification"
      ? scoredRows.filter((row) => Number(row.roundNumber ?? 0) <= activeRound.roundNumber)
      : scoredRows;
  const standings = calculateStandings(scopedScoredRows);
  const tableNameMap = new Map(tables.map((table) => [table.id, table.tableName ?? `Meja ${table.tableNumber}`]));
  const qualificationRankMap = new Map(standings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(standings.map((row) => [row.participantId, row]));
  const finalResults = activeRound?.roundType === "final"
    ? tournament.isExhibition
      ? calculateExhibitionFinalResults(players, tableNameMap)
      : calculateFinalResults(players, qualificationRankMap, qualificationRowMap, tableNameMap)
    : [];
  const viewerTables = tables.map((table) => ({
    id: table.id,
    tableNumber: table.tableNumber,
    tableName: table.tableName ?? `Meja ${table.tableNumber}`,
    players: players
      .filter((player) => player.tableId === table.id)
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .map((player) => ({
        id: player.id,
        seatNumber: player.seatNumber,
        participantName: player.participantName,
        communityName: player.communityName,
        score: player.score,
        tableRank: player.tableRank,
      })),
  }));
  const viewerStandings = standings.map((row, index) => ({
    participantId: row.participantId,
    rank: index + 1,
    name: row.name,
    communityName: row.communityName,
    totalPoint: row.totalPoint,
    totalScore: row.totalScore,
    firstPlaceCount: row.firstPlaceCount,
    secondPlaceCount: row.secondPlaceCount,
    thirdPlaceCount: row.thirdPlaceCount,
  }));

  return (
    <main className="h-screen overflow-hidden bg-foreground py-4 text-background">
      <ViewerBoard
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        selectedRoundId={activeRound?.id ?? null}
        roundOptions={rounds.map((round) => ({
          id: round.id,
          label: round.roundType === "final" ? "Final" : round.roundType === "semifinal" ? "Semi Final" : `Babak ${round.roundNumber}`,
          status: round.status,
        }))}
        roundType={activeRound?.roundType ?? "qualification"}
        roundLabel={activeRound ? (activeRound.roundType === "final" ? "Final" : activeRound.roundType === "semifinal" ? "Semi Final" : `Babak ${activeRound.roundNumber}`) : "Belum ada babak"}
        statusLabel={activeRound?.status ?? "-"}
        tables={viewerTables}
        standings={viewerStandings}
        finalResults={finalResults}
      />
    </main>
  );
}
