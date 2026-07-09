import Link from "next/link";
import { getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { calculateExhibitionFinalResults, calculateFinalResults } from "@/lib/tournament/final-results";
import { Badge } from "@/components/ui/badge";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";
import { MedalHeader, RoundScore } from "@/components/tournament/standings-format";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAuth();
  const { tournamentId } = await params;
  const query = await searchParams;
  const activeTab = query.tab === "final" ? "final" : "qualification";
  const [tournament, summary, rows, rounds] = await Promise.all([
    getTournament(tournamentId),
    getTournamentSummary(tournamentId),
    getScoredQualificationPlayers(tournamentId),
    getRounds(tournamentId),
  ]);
  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const standings = calculateStandings(rows);
  const finalRound = rounds.find((round) => round.roundType === "final");
  const [finalTables, finalPlayers] = activeTab === "final" && finalRound
    ? await Promise.all([getTables(finalRound.id), getTablePlayersByRound(finalRound.id)])
    : [[], []];
  const finalTableNameMap = new Map(finalTables.map((table) => [table.id, table.tableName ?? `Meja ${table.tableNumber}`]));
  const qualificationRankMap = new Map(standings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(standings.map((row) => [row.participantId, row]));
  const finalResults = activeTab === "final"
    ? tournament.isExhibition
      ? calculateExhibitionFinalResults(finalPlayers, finalTableNameMap)
      : calculateFinalResults(finalPlayers, qualificationRankMap, qualificationRowMap, finalTableNameMap)
    : [];

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="standings" showViewerButton={false}>
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-2">
          <Link
            href={`/tournaments/${tournamentId}/standings`}
            className={`border border-b-0 px-4 py-2 font-semibold ${activeTab === "qualification" ? "bg-foreground text-background" : "bg-card"}`}
          >
            Penyisihan
          </Link>
          <Link
            href={`/tournaments/${tournamentId}/standings?tab=final`}
            className={`border border-b-0 px-4 py-2 font-semibold ${activeTab === "final" ? "bg-foreground text-background" : "bg-card"}`}
          >
            Final
          </Link>
        </div>
      </div>

      {activeTab === "qualification" ? (
        <section className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3">Rank</th>
                <th>Peserta</th>
                <th>Komunitas</th>
                <th>Total Poin</th>
                <th>Total Skor</th>
                <th><MedalHeader rank={1} /></th>
                <th><MedalHeader rank={2} /></th>
                <th><MedalHeader rank={3} /></th>
                <th className="border-l border-border pl-4">B1</th>
                <th>B2</th>
                <th>B3</th>
                <th>B4</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr key={row.participantId} className="border-t">
                  <td className="p-3 font-semibold">{index + 1}</td>
                  <td className="font-medium">
                    {row.name}
                    {index < tournament.finalistCount && <Badge tone="good" className="ml-2">Zona Final</Badge>}
                  </td>
                  <td>{row.communityName ?? "-"}</td>
                  <td className="font-semibold">{row.totalPoint}</td>
                  <td>{row.totalScore}</td>
                  <td>{row.firstPlaceCount}</td>
                  <td>{row.secondPlaceCount}</td>
                  <td>{row.thirdPlaceCount}</td>
                  {[1, 2, 3, 4].map((roundNumber) => (
                    <td key={roundNumber} className={roundNumber === 1 ? "border-l border-border pl-4" : ""}>
                      <RoundScore result={row.rounds[roundNumber]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="overflow-x-auto border border-border bg-card">
          {finalResults.length > 0 ? (
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">{tournament.isExhibition ? "Papan" : "Juara"}</th>
                  <th>Peserta</th>
                  <th>Komunitas</th>
                  <th>Meja final</th>
                  <th>Rank meja</th>
                  <th>Skor final</th>
                  {!tournament.isExhibition && <th>Rank penyisihan</th>}
                  {!tournament.isExhibition && <th>Poin penyisihan</th>}
                  {!tournament.isExhibition && <th>Skor penyisihan</th>}
                </tr>
              </thead>
              <tbody>
                {finalResults.map((row) => (
                  <tr key={row.participantId} className="border-t">
                    <td className="p-3 font-semibold">{tournament.isExhibition ? `${row.boardName} / Juara ${row.position}` : `Juara ${row.position}`}</td>
                    <td className="font-medium">{row.name}</td>
                    <td>{row.communityName ?? "-"}</td>
                    <td>{row.tableName}</td>
                    <td>R{row.tableRank}</td>
                    <td className="font-semibold">{row.score}</td>
                    {!tournament.isExhibition && <td>{row.qualificationRank}</td>}
                    {!tournament.isExhibition && <td>{row.qualificationPoint}</td>}
                    {!tournament.isExhibition && <td>{row.qualificationScore}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-muted-foreground">
              Klasemen final muncul setelah skor final diinput.
            </div>
          )}
        </section>
      )}
    </TournamentSectionShell>
  );
}
