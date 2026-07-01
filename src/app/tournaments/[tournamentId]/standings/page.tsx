import Link from "next/link";
import { getScoredQualificationPlayers, getTournament } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { MedalHeader, RoundScore } from "@/components/tournament/standings-format";

export const dynamic = "force-dynamic";

export default async function StandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  await requireAuth();
  const { tournamentId } = await params;
  const [tournament, rows] = await Promise.all([getTournament(tournamentId), getScoredQualificationPlayers(tournamentId)]);
  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const standings = calculateStandings(rows);

  return (
    <main className="app-container grid gap-8 py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-primary">&larr; Dashboard</Link>
          <h1 className="mt-3 text-4xl font-semibold">Klasemen penyisihan</h1>
        </div>
        <Link href={`/api/export?tournamentId=${tournamentId}`} className={buttonClass({ variant: "outline" })}>Export Excel</Link>
      </header>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
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
                <td className="font-medium">{row.name} {index < tournament.finalistCount && <Badge tone="good" className="ml-2">Zona Final</Badge>}</td>
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
      </div>
    </main>
  );
}
