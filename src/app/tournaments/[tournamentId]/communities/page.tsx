import Link from "next/link";
import { notFound } from "next/navigation";
import { Communities } from "@/components/flexible/communities";
import { SetupNotice } from "@/components/flexible/shell";
import { getEvent } from "@/lib/flexible/store";

export default async function CommunitiesPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let event;
  try { event = await getEvent(tournamentId); } catch { return <SetupNotice />; }
  if (!event) notFound();
  return <><Link className="neo-back" href={`/tournaments/${event.id}`}>← {event.data.settings.name}</Link><header className="neo-page-heading"><span className="neo-eyebrow">MASTER DATA</span><h1>Komunitas / sektor</h1><p>Kelola komunitas atau sektor yang digunakan pada data peserta turnamen.</p></header><Communities event={event} /></>;
}
