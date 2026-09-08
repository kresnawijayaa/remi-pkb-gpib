import Link from "next/link";
import { listEvents } from "@/lib/flexible/store";
import { SetupNotice } from "@/components/flexible/shell";
import { scoringComplete } from "@/lib/flexible/scoring";

export default async function TournamentsPage() {
  let events;
  try { events = await listEvents(); } catch { return <SetupNotice />; }
  return <><section className="neo-hero"><div><span className="neo-eyebrow">DAFTAR TURNAMEN</span><h1>Turnamen REMI</h1><p>Kelola peserta, pembagian meja, skor, klasemen, dan tahap lanjutan turnamen.</p><Link className="neo-button" href="/tournaments/new">+ Buat turnamen</Link></div><div className="neo-poster" aria-hidden="true"><span>ALUR PESERTA</span><div>200 <b>↘</b><br />20 <b>↘</b> 10</div><small>PESERTA AWAL · LOLOS · FINAL</small></div></section>
    <section><div className="neo-section-heading"><h2>Daftar turnamen <span className="neo-count">{events.length}</span></h2></div>
      {events.length === 0 ? <div className="neo-empty"><span className="neo-empty-symbol" aria-hidden="true">♣</span><h3>Belum ada turnamen. Mulai dari aturan Anda.</h3><p>Tentukan peserta, meja, babak, dan jumlah lolos. Daftar nama bisa ditambahkan setelahnya.</p><Link className="neo-text-link" href="/tournaments/new">Buat turnamen pertama →</Link></div> : <div className="neo-event-list">{events.map(event => { const { settings, participants, draws } = event.data; const locked = draws.filter(draw => draw.locked).length; const complete = scoringComplete(event.data); const status = event.data.qualificationLockedAt ? "SELESAI" : complete ? "SKOR LENGKAP" : event.data.results.length ? "SEDANG BERJALAN" : locked === settings.rounds ? "SIAP DIMAINKAN" : "DALAM PERSIAPAN"; return <Link className="neo-event" href={`/tournaments/${event.id}`} key={event.id}><div><span className={`neo-tag ${locked === settings.rounds ? "neo-green" : ""}`}>{status}</span><h3>{settings.name}</h3></div><div className="neo-event-detail"><span><b>{participants.length}/{settings.target}</b> peserta</span><span><b>{locked}/{settings.rounds}</b> pembagian dikunci</span><span><b>{settings.advancing}</b> lolos</span></div><span className="neo-arrow" aria-hidden="true">↗</span></Link>; })}</div>}
    </section><div className="neo-footnote">Mencari pertandingan sebelumnya? <Link href="/tournaments-old">Buka arsip REMI lama →</Link></div></>;
}
