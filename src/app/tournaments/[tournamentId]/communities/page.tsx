import { getCommunities, getParticipants, getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";
import { createCommunityAction } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CommunityEditRow } from "@/components/tournament/community-edit-row";
import { DevTestingMenu } from "@/components/tournament/dev-testing-menu";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  await requireAuth();
  const { tournamentId } = await params;
  const [tournament, summary, communities, participants] = await Promise.all([
    getTournament(tournamentId),
    getTournamentSummary(tournamentId),
    getCommunities(tournamentId),
    getParticipants(tournamentId),
  ]);

  if (!tournament) return <main className="app-container py-8">Turnamen tidak ditemukan.</main>;

  const participantCountByCommunity = new Map<string, number>();
  for (const participant of participants) {
    if (!participant.communityId) continue;
    participantCountByCommunity.set(participant.communityId, (participantCountByCommunity.get(participant.communityId) ?? 0) + 1);
  }

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="communities">
      <section className="border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <h2 className="font-semibold">Tambah komunitas</h2>
            </div>
            <form action={createCommunityAction} className="grid gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div className="grid gap-2">
                <Label>Nama komunitas</Label>
                <Input name="name" placeholder="Sektor 1" required />
              </div>
              <SubmitButton pendingText="Menyimpan...">Simpan komunitas</SubmitButton>
            </form>
          </div>

          <div className="min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Daftar komunitas</h2>
              <span className="text-sm text-muted-foreground">{communities.length} data</span>
            </div>
            <div className="max-h-[380px] overflow-auto border border-border">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_72px_72px] gap-2 bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid">
                <div>Nama</div>
                <div>Peserta</div>
                <div></div>
                <div></div>
              </div>
              <div className="divide-y divide-border">
                {communities.map((community) => (
                  <CommunityEditRow
                    key={community.id}
                    tournamentId={tournamentId}
                    community={community}
                    participantCount={participantCountByCommunity.get(community.id) ?? 0}
                  />
                ))}
                {communities.length === 0 && <div className="p-6 text-muted-foreground">Belum ada komunitas.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <DevTestingMenu
        tournamentId={tournamentId}
        actions={[
          {
            kind: "communities",
            label: "Isi komunitas contoh",
            description: "Mengisi data komunitas simulasi.",
          },
        ]}
      />
    </TournamentSectionShell>
  );
}
