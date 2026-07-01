import { getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { calculateFinalResults } from "@/lib/tournament/final-results";
import { ViewerBoard } from "@/components/tournament/viewer-board";

export const dynamic = "force-dynamic";

export default async function ViewerPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  await requireAuth();
  const { tournamentId } = await params;
  const [tournament, rounds, scoredRows] = await Promise.all([getTournament(tournamentId), getRounds(tournamentId), getScoredQualificationPlayers(tournamentId)]);
  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const activeRound = rounds.find((round) => round.status === "active") ?? rounds.at(-1);
  const tables = activeRound ? await getTables(activeRound.id) : [];
  const players = activeRound ? await getTablePlayersByRound(activeRound.id) : [];
  const standings = calculateStandings(scoredRows);
  const tableNameMap = new Map(tables.map((table) => [table.id, table.tableName ?? `Meja ${table.tableNumber}`]));
  const qualificationRankMap = new Map(standings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(standings.map((row) => [row.participantId, row]));
  const finalResults = activeRound?.roundType === "final"
    ? calculateFinalResults(players, qualificationRankMap, qualificationRowMap, tableNameMap)
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
        roundType={activeRound?.roundType ?? "qualification"}
        roundLabel={activeRound ? (activeRound.roundType === "final" ? "Final" : `Babak ${activeRound.roundNumber}`) : "Belum ada babak"}
        statusLabel={activeRound?.status ?? "-"}
        tables={viewerTables}
        standings={viewerStandings}
        finalResults={finalResults}
      />
    </main>
  );
}
