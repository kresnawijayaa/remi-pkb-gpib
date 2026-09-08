import { getCommunities, getParticipants, getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";
import { createParticipantAction } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ParticipantEditRow } from "@/components/tournament/participant-edit-row";
import { DevTestingMenu } from "@/components/tournament/dev-testing-menu";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  await requireAuth();
  const { tournamentId } = await params;
  const [tournament, summary, participants, communities] = await Promise.all([
    getTournament(tournamentId),
    getTournamentSummary(tournamentId),
    getParticipants(tournamentId),
    getCommunities(tournamentId),
  ]);

  if (!tournament) return <main className="app-container py-8">Turnamen tidak ditemukan.</main>;

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="participants">
      <section className="border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <h2 className="font-semibold">Tambah peserta</h2>
            </div>
            <form action={createParticipantAction} className="grid gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div className="grid grid-cols-[96px_1fr] gap-3">
                <div className="grid gap-2">
                  <Label>No</Label>
                  <Input name="participantNumber" type="number" defaultValue={participants.length + 1} required />
                </div>
                <div className="grid gap-2">
                  <Label>Nama</Label>
                  <Input name="name" placeholder="Pak Andri" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Komunitas</Label>
                <select name="communityId" className="h-10 rounded-sm border border-input bg-background px-3">
                  <option value="">Tanpa komunitas</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>No HP</Label>
                <Input name="phone" />
              </div>
              <SubmitButton pendingText="Menyimpan...">Simpan peserta</SubmitButton>
            </form>
          </div>

          <div className="min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Daftar peserta</h2>
              <span className="text-sm text-muted-foreground">{participants.length} data</span>
            </div>
            <div className="max-h-[380px] overflow-auto border border-border">
              <div className="hidden grid-cols-[72px_1.2fr_1fr_1fr_1fr_72px_72px] gap-2 bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid">
                <div>No</div>
                <div>Nama</div>
                <div>Komunitas</div>
                <div>No HP</div>
                <div>Status</div>
                <div></div>
                <div></div>
              </div>
              <div className="divide-y divide-border">
                {participants.map((participant) => (
                  <ParticipantEditRow
                    key={participant.id}
                    tournamentId={tournamentId}
                    participant={participant}
                    communities={communities}
                  />
                ))}
                {participants.length === 0 && <div className="p-6 text-muted-foreground">Belum ada peserta.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <DevTestingMenu
        tournamentId={tournamentId}
        actions={[
          {
            kind: "participants",
            label: "Isi peserta contoh",
            description: "Mengisi data peserta simulasi.",
          },
        ]}
      />
    </TournamentSectionShell>
  );
}
