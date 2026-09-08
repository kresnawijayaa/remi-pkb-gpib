import Link from "next/link";
import { notFound } from "next/navigation";
import { GameBoard } from "@/components/flexible/game-board";
import { DevScoreTools } from "@/components/flexible/dev-score-tools";
import { SetupNotice } from "@/components/flexible/shell";
import { getEvent } from "@/lib/flexible/store";

export default async function GamePage({ params, searchParams }: { params: Promise<{ tournamentId: string }>; searchParams: Promise<{ round?: string }> }) {
  const { tournamentId } = await params;
  const query = await searchParams;
  let event;
  try { event = await getEvent(tournamentId); } catch { return <SetupNotice />; }
  if (!event) notFound();
  const requested = Number(query.round ?? 1);
  const selected = Number.isInteger(requested) ? Math.max(1, Math.min(requested, event.data.settings.rounds)) : 1;
  const lockedRounds = event.data.draws.filter(draw => draw.locked).length;
  return <><Link className="neo-back" href={`/tournaments/${event.id}`}>← {event.data.settings.name}</Link><header className="neo-page-heading"><span className="neo-eyebrow">03 / PERTANDINGAN</span><h1>Input skor</h1><p>Masukkan skor akhir setiap meja. Pada meja lima orang, peringkat 1–5 memperoleh 5, 4, 3, 2, dan 1 poin. Gunakan urutan seri jika terdapat skor yang sama.</p></header><div className="neo-actions"><Link className="neo-button neo-secondary" href={`/tournaments/${event.id}/standings`}>Lihat klasemen →</Link></div>{process.env.REMI_DEV_TOOLS_ENABLED === "true" && lockedRounds > 0 && !event.data.qualificationLockedAt && <DevScoreTools eventId={event.id} version={event.version} round={selected} lockedRounds={lockedRounds} />}<GameBoard event={event} selected={selected} /></>;
}
