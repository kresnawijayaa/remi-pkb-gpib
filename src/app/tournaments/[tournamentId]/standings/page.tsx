import Link from "next/link";
import { notFound } from "next/navigation";
import { StandingsBoard } from "@/components/flexible/standings-board";
import { SetupNotice } from "@/components/flexible/shell";
import { getEvent } from "@/lib/flexible/store";

export default async function StandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let event;
  try { event = await getEvent(tournamentId); } catch { return <SetupNotice />; }
  if (!event) notFound();
  return <><Link className="neo-back" href={`/tournaments/${event.id}`}>← {event.data.settings.name}</Link><header className="neo-page-heading"><span className="neo-eyebrow">04 / HASIL</span><h1>Klasemen</h1><p>Klasemen dihitung dari seluruh hasil meja yang telah disimpan dan digunakan untuk menentukan peserta yang lolos.</p></header><div className="neo-actions"><Link className="neo-button neo-secondary" href={`/tournaments/${event.id}/game`}>← Input skor</Link></div><StandingsBoard event={event} /></>;
}
