import { getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";
import { importParticipantsAction } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  await requireAuth();
  const { tournamentId } = await params;
  const [tournament, summary] = await Promise.all([getTournament(tournamentId), getTournamentSummary(tournamentId)]);

  if (!tournament) return <main className="app-container py-8">Turnamen tidak ditemukan.</main>;

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="import">
      <section className="border border-border bg-card">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
          <form action={importParticipantsAction} className="grid gap-3">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <div className="grid gap-2">
              <Label>CSV peserta</Label>
              <Textarea
                name="csv"
                className="min-h-44"
                placeholder={"No,Nama,Komunitas,No HP\n1,Pak Andri,Sektor 1,\n2,Pak Budi,Sektor 2,"}
              />
            </div>
            <SubmitButton variant="secondary" pendingText="Mengimpor...">
              Import peserta
            </SubmitButton>
          </form>
          <div className="border border-border bg-background p-4 text-sm text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">Format</div>
            <div>No,Nama,Komunitas,No HP</div>
            <div className="mt-3">Baris header boleh dipakai. Komunitas otomatis dibuat bila belum ada.</div>
          </div>
        </div>
      </section>
    </TournamentSectionShell>
  );
}
