import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/flexible/store";
import { DrawBoard } from "@/components/flexible/draw-board";
import { SetupNotice } from "@/components/flexible/shell";

export default async function DrawsPage({ params, searchParams }: { params: Promise<{ tournamentId: string }>; searchParams: Promise<{ round?: string }> }) {
  const { tournamentId } = await params;
  const query = await searchParams;
  let event;
  try { event = await getEvent(tournamentId); } catch { return <SetupNotice />; }
  if (!event) notFound();
  const requested = Number(query.round ?? 1);
  const selected = Number.isInteger(requested) ? Math.max(1, Math.min(requested, event.data.settings.rounds)) : 1;
  return <><Link className="neo-back" href={`/tournaments/${event.id}`}>← {event.data.settings.name}</Link><header className="neo-page-heading"><span className="neo-eyebrow">02 / PEMBAGIAN MEJA</span><h1>Pembagian meja</h1><p>Generate pembagian setiap babak secara acak atau berdasarkan peringkat. Susunan dapat ditinjau, ditukar manual, dan dikunci sebelum pertandingan.</p></header><DrawBoard event={event} selected={selected} /></>;
}
