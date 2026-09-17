import { notFound } from "next/navigation";
import { PublicStandings } from "@/components/flexible/public-standings";
import { Shell } from "@/components/flexible/shell";
import { getSharedStandings } from "@/lib/flexible/store";
import "@/app/tournaments/neo.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klasemen · REMI", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function PublicStandingsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let event;
  try { event = await getSharedStandings(token); }
  catch { return <Shell publicView publicMode="standings"><div className="neo-empty"><h1>Klasemen belum dapat dimuat.</h1><p>Koneksi sedang bermasalah. Muat ulang halaman atau hubungi panitia.</p></div></Shell>; }
  if (!event) notFound();
  return <Shell publicView publicMode="standings"><PublicStandings {...event} /></Shell>;
}
