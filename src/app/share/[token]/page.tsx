import { notFound } from "next/navigation";
import { getSharedEvent } from "@/lib/flexible/store";
import { PublicBoard } from "@/components/flexible/public-board";
import { Shell } from "@/components/flexible/shell";
import "@/app/tournaments/neo.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembagian meja · REMI", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let event;
  try { event = await getSharedEvent(token); }
  catch { return <Shell publicView><div className="neo-empty"><h1>Jadwal belum dapat dimuat.</h1><p>Koneksi sedang bermasalah. Muat ulang halaman atau hubungi panitia.</p></div></Shell>; }
  if (!event) notFound();
  return <Shell publicView><PublicBoard {...event} /></Shell>;
}
