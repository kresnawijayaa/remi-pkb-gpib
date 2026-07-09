import Link from "next/link";
import { getRounds, getTournament, getTournamentSummary } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { TournamentSectionShell } from "@/components/tournament/tournament-section-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { generateFinalAction, generateRoundAction } from "@/app/actions";
import { DeleteRoundForm } from "@/components/tournament/delete-round-form";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  const { tournamentId } = await params;
  const query = await searchParams;
  const [tournament, summary, rounds] = await Promise.all([
    getTournament(tournamentId),
    getTournamentSummary(tournamentId),
    getRounds(tournamentId),
  ]);

  if (!tournament) return <main className="app-container py-8">Turnamen tidak ditemukan.</main>;

  const qualificationRounds = rounds.filter((round) => round.roundType === "qualification");
  const lockedQualificationCount = rounds.filter((round) => round.roundType === "qualification" && round.status === "locked").length;
  const activeRound = rounds.find((round) => round.status === "active") ?? rounds.find((round) => round.status === "draft") ?? rounds.at(-1);
  const qualificationLimitReached = qualificationRounds.length >= tournament.qualificationRoundCount;
  const hasUnlockedQualificationRound = qualificationRounds.some((round) => round.status !== "locked");
  const semifinalRound = rounds.find((round) => round.roundType === "semifinal");
  const hasFinalRound = rounds.some((round) => round.roundType === "final");
  const lastRoundId = rounds.at(-1)?.id ?? null;
  const nextRoundButtonLabel = qualificationRounds.length > 0 ? "Buat Babak Berikutnya" : "Buat Babak Pertama";
  const finalButtonLabel = tournament.isExhibition && !semifinalRound ? "Generate Semi Final" : "Generate Final";
  const canGenerateExhibitionStep = tournament.isExhibition
    ? lockedQualificationCount >= tournament.qualificationRoundCount &&
      (!semifinalRound || (semifinalRound.status === "locked" && !hasFinalRound))
    : lockedQualificationCount >= tournament.qualificationRoundCount && !hasFinalRound;
  const cannotGenerateRoundReason = hasUnlockedQualificationRound
    ? "Kunci babak berjalan dulu."
    : qualificationLimitReached
      ? "Penyisihan sudah lengkap."
      : null;
  const notice = getTournamentNotice(query.error);

  return (
    <TournamentSectionShell tournamentId={tournamentId} tournament={tournament} summary={summary} activeSection="game">
      <section className="grid min-w-0 gap-4">
        {notice && <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{notice}</div>}
        <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Monitoring permainan</h2>
            <div className="mt-1 text-sm text-muted-foreground">Fokus babak, status meja, dan klasemen berjalan.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={generateRoundAction} className="flex flex-wrap items-center justify-end gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <SubmitButton
                disabled={Boolean(cannotGenerateRoundReason)}
                pendingText="Membuat babak..."
                title={cannotGenerateRoundReason ?? undefined}
              >
                {nextRoundButtonLabel}
              </SubmitButton>
            </form>
            <form action={generateFinalAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <SubmitButton variant="outline" disabled={!canGenerateExhibitionStep} pendingText="Membuat...">
                {finalButtonLabel}
              </SubmitButton>
            </form>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Babak</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeRound ? `Fokus: ${getRoundLabel(activeRound)}` : "Belum ada babak."}
                </p>
              </div>
              {activeRound && <Badge tone={activeRound.status === "locked" ? "good" : activeRound.status === "active" ? "warn" : "neutral"}>{activeRound.status}</Badge>}
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <div className="border border-dashed border-border bg-background p-6 text-muted-foreground">Belum ada babak.</div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {rounds.map((round) => (
                    <article key={round.id} className="grid min-w-0 gap-3 border border-border bg-background p-4">
                      <Link
                        href={round.roundType === "final" ? `/tournaments/${tournamentId}/final` : `/tournaments/${tournamentId}/rounds/${round.id}`}
                        className="grid gap-2 transition hover:text-primary active:translate-y-px"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{getRoundLabel(round)}</span>
                          <Badge tone={round.status === "locked" ? "good" : round.status === "active" ? "warn" : "neutral"}>{round.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {round.roundType === "final"
                            ? tournament.isExhibition ? "Final papan atas dan papan bawah" : "Penentuan juara"
                            : round.roundType === "semifinal"
                              ? "Semi final papan atas dan papan bawah"
                              : `Penyisihan ${Math.min(round.roundNumber, tournament.qualificationRoundCount)}/${tournament.qualificationRoundCount}`}
                        </div>
                      </Link>
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">{round.id === lastRoundId ? "Babak terakhir" : "Terkunci dari hapus"}</span>
                        {round.id === lastRoundId && (
                          <DeleteRoundForm
                            tournamentId={tournamentId}
                            roundId={round.id}
                            label={getRoundLabel(round)}
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </TournamentSectionShell>
  );
}

function getTournamentNotice(error?: string) {
  if (error === "previous-round-unlocked") return "Babak berikutnya belum bisa dibuat. Kunci babak penyisihan yang sedang berjalan dulu.";
  if (error === "not-enough-participants") return "Minimal 10 peserta aktif diperlukan untuk membuat babak.";
  if (error === "qualification-round-limit") return "Jumlah babak penyisihan sudah mencapai batas. Lanjutkan dengan Generate Final.";
  if (error === "semifinal-unlocked") return "Final belum bisa dibuat. Kunci semi final dulu.";
  return null;
}

function getRoundLabel(round: { roundType: string; roundNumber: number }) {
  if (round.roundType === "final") return "Final";
  if (round.roundType === "semifinal") return "Semi Final";
  return `Babak ${round.roundNumber}`;
}
