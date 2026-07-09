import Link from "next/link";
import { getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";

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
  const [tournament, summary] = await Promise.all([getTournament(tournamentId), getTournamentSummary(tournamentId)]);
  const notice = getTournamentNotice(query.error);

  if (!tournament) return <main className="p-8">Turnamen tidak ditemukan.</main>;

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="dashboard">
      {notice && <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{notice}</div>}
      <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="border border-border bg-card p-4">
          <h2 className="text-xl font-semibold">Dashboard turnamen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Akses cepat ke data peserta, komunitas, impor, permainan, dan klasemen.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href={`/tournaments/${tournamentId}/participants`} className={buttonClass({ variant: "outline", className: "justify-start" })}>
              Peserta
            </Link>
            <Link href={`/tournaments/${tournamentId}/communities`} className={buttonClass({ variant: "outline", className: "justify-start" })}>
              Komunitas
            </Link>
            <Link href={`/tournaments/${tournamentId}/import`} className={buttonClass({ variant: "outline", className: "justify-start" })}>
              Import CSV
            </Link>
            <Link href={`/tournaments/${tournamentId}/game`} className={buttonClass({ variant: "outline", className: "justify-start" })}>
              Permainan
            </Link>
            <Link href={`/tournaments/${tournamentId}/standings`} className={buttonClass({ variant: "outline", className: "justify-start" })}>
              Top klasemen
            </Link>
          </div>
        </div>
        <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">Catatan</div>
          <div className="mt-2">Halaman ini sudah dipisah per menu supaya fetch data lebih ringan.</div>
          <div className="mt-2">Gunakan menu kiri untuk masuk ke data yang dibutuhkan.</div>
        </div>
      </section>
    </TournamentSectionShell>
  );
}

function getTournamentNotice(error?: string) {
  if (error === "previous-round-unlocked") return "Babak berikutnya belum bisa dibuat. Kunci babak penyisihan yang sedang berjalan dulu.";
  if (error === "not-enough-participants") return "Minimal 10 peserta aktif diperlukan untuk membuat babak.";
  if (error === "qualification-round-limit") return "Jumlah babak penyisihan sudah mencapai batas. Lanjutkan dengan Generate Final.";
  return null;
}
