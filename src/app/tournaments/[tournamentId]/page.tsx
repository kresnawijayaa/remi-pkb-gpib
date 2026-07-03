import Link from "next/link";
import { getCommunities, getParticipants, getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import { calculateFinalResults } from "@/lib/tournament/final-results";
import { buttonClass } from "@/components/ui/button";
import { TournamentSetupTabs } from "@/components/tournament/tournament-setup-tabs";
import { ViewerLinkModal } from "@/components/tournament/viewer-link-modal";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  const { tournamentId } = await params;
  const query = await searchParams;
  const [tournament, summary, participants, communities, rounds, scoredRows] = await Promise.all([
    getTournament(tournamentId),
    getTournamentSummary(tournamentId),
    getParticipants(tournamentId),
    getCommunities(tournamentId),
    getRounds(tournamentId),
    getScoredQualificationPlayers(tournamentId),
  ]);

  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;
  const standings = calculateStandings(scoredRows);
  const finalRound = rounds.find((round) => round.roundType === "final");
  const finalTables = finalRound ? await getTables(finalRound.id) : [];
  const finalPlayers = finalRound ? await getTablePlayersByRound(finalRound.id) : [];
  const tableNameMap = new Map(finalTables.map((table) => [table.id, table.tableName ?? `Meja ${table.tableNumber}`]));
  const qualificationRankMap = new Map(standings.map((row, index) => [row.participantId, index + 1]));
  const qualificationRowMap = new Map(standings.map((row) => [row.participantId, row]));
  const finalResults = calculateFinalResults(finalPlayers, qualificationRankMap, qualificationRowMap, tableNameMap);
  const initialMenu = rounds.length > 0 ? "game" : "participants";
  const notice = getTournamentNotice(query.error);

  return (
    <main className="app-container grid gap-5 py-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href="/" className="text-sm font-semibold text-primary">&larr; Semua turnamen</Link>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">{tournament.name}</h1>
          <p className="mt-2 text-muted-foreground">{tournament.eventDate ?? "Tanggal belum diisi"} / {tournament.location ?? "Lokasi belum diisi"}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ViewerLinkModal viewerPath={`/tournaments/${tournamentId}/viewer`} />
          <Link className={buttonClass({ variant: "outline" })} href={`/api/export?tournamentId=${tournamentId}`}>Export Excel</Link>
        </div>
      </header>

      <section className="grid border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Peserta" value={summary.participantCount} />
        <Stat label="Komunitas" value={summary.communityCount} />
        <Stat label="Babak" value={summary.roundCount} />
        <Stat label="Meja submit" value={`${summary.submittedTableCount}/${summary.tableCount}`} />
      </section>

      {notice && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {notice}
        </div>
      )}

      <TournamentSetupTabs
        tournamentId={tournamentId}
        tournament={tournament}
        summary={summary}
        participants={participants}
        communities={communities}
        rounds={rounds}
        standings={standings}
        finalResults={finalResults}
        initialMenu={initialMenu}
      />
    </main>
  );
}

function getTournamentNotice(error?: string) {
  if (error === "previous-round-unlocked") return "Babak berikutnya belum bisa dibuat. Kunci babak penyisihan yang sedang berjalan dulu.";
  if (error === "not-enough-participants") return "Minimal 10 peserta aktif diperlukan untuk membuat babak.";
  if (error === "qualification-round-limit") return "Jumlah babak penyisihan sudah mencapai batas. Lanjutkan dengan Generate Final.";
  return null;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-b border-border p-3 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
