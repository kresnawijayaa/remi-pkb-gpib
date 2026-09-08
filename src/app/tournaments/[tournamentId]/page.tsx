import Link from "next/link";
import { notFound } from "next/navigation";
import { DevTools } from "@/components/flexible/dev-tools";
import { ActionForm, Confirm, SendButton } from "@/components/flexible/form";
import { Participants } from "@/components/flexible/participants";
import { SettingsFields } from "@/components/flexible/settings";
import { ShareLink } from "@/components/flexible/share-link";
import { SetupNotice } from "@/components/flexible/shell";
import { getEvent } from "@/lib/flexible/store";
import { expectedTableCount, scoringComplete } from "@/lib/flexible/scoring";

export default async function EventPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  let event;
  try { event = await getEvent(tournamentId); } catch { return <SetupNotice />; }
  if (!event) notFound();
  const { settings, draws, participants } = event.data;
  const locked = draws.filter(draw => draw.locked).length;
  const expectedResults = expectedTableCount(event.data);
  const scoresComplete = scoringComplete(event.data);
  const status = event.data.qualificationLockedAt ? "HASIL DIKUNCI / SELESAI" : scoresComplete ? "SKOR LENGKAP / PERIKSA KELOLOSAN" : event.data.results.length ? "PERTANDINGAN BERJALAN" : locked === settings.rounds ? "SIAP DIMAINKAN" : "DALAM PERSIAPAN";
  const description = event.data.qualificationLockedAt ? `${event.data.qualifiedIds.length} peserta lolos sudah dikunci. Turnamen ini siap dijadikan arsip hasil.` : scoresComplete ? "Seluruh skor sudah masuk. Periksa klasemen lalu kunci peserta yang lolos." : event.data.results.length ? `${event.data.results.length} dari ${expectedResults} hasil meja sudah masuk.` : locked === settings.rounds ? "Seluruh pembagian sudah dikunci. Pertandingan dan input skor dapat dimulai." : "Lengkapi peserta dan kunci pembagian meja sebelum pertandingan.";
  const next = event.data.qualificationLockedAt || scoresComplete ? { title: event.data.qualificationLockedAt ? "Hasil akhir" : "Klasemen dan kelolosan", detail: event.data.qualificationLockedAt ? "Kelolosan telah dikunci dan tahap lanjutan dapat dibuat." : "Semua hasil meja sudah lengkap. Periksa klasemen sebelum mengunci peserta yang lolos.", href: `/tournaments/${event.id}/standings`, label: "Buka klasemen →" } : locked === settings.rounds || event.data.results.length ? { title: "Input skor", detail: `${event.data.results.length}/${expectedResults} hasil meja sudah masuk.`, href: `/tournaments/${event.id}/game`, label: "Buka input skor →" } : { title: "Pembagian meja", detail: `${Math.max(0, settings.target - participants.length)} nama lagi sebelum pembagian dapat dibuat. Kapasitas maksimal ${settings.capacity} orang per meja.`, href: `/tournaments/${event.id}/draws`, label: "Buka pembagian meja →" };
  return <><Link className="neo-back" href="/tournaments">← Semua turnamen</Link><header className="neo-page-heading"><span className="neo-eyebrow">{status}</span><h1>{settings.name}</h1><p>{description}</p></header>
    <div className="neo-progress"><span><b>01</b> Peserta <strong>{participants.length}/{settings.target}</strong></span><span><b>02</b> Pembagian dikunci <strong>{locked}/{settings.rounds}</strong></span><span><b>03</b> Hasil meja <strong>{event.data.results.length}/{expectedResults}</strong></span></div>
    <div className="neo-two-col"><Participants event={event} /><aside className="neo-stack"><section className="neo-panel neo-yellow"><span className="neo-eyebrow">LANGKAH BERIKUTNYA</span><h2>{next.title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><p>{next.detail}</p><Link className="neo-button neo-dark" href={next.href}>{next.label}</Link></section>
      <section className="neo-panel"><h2>Master komunitas</h2><p>{event.data.communities.length} komunitas / sektor terdaftar. Peserta manual memilih dari daftar ini.</p><Link className="neo-button neo-secondary" href={`/tournaments/${event.id}/communities`}>Kelola komunitas →</Link></section>
      <section className="neo-panel"><h2>Bagikan tanpa skor</h2><p>Hanya nama, komunitas, meja, dan babak terkunci. Siapa pun yang memiliki link bisa melihatnya.</p>{event.shareToken && <ShareLink token={event.shareToken} />}<ActionForm eventId={event.id} version={event.version} operation="share">{event.shareToken && <Confirm>Link lama akan berhenti berlaku.</Confirm>}<SendButton secondary disabled={locked === 0}>{event.shareToken ? "Ganti link" : "Buat link pembagian"}</SendButton></ActionForm>{event.shareToken && <details className="neo-disclosure"><summary>Cabut akses publik</summary><ActionForm eventId={event.id} version={event.version} operation="revoke"><Confirm>Nonaktifkan link yang sudah dibagikan.</Confirm><SendButton secondary>Cabut link</SendButton></ActionForm></details>}</section>
      <section className="neo-panel"><h2>Jalankan pertandingan</h2><p><strong>{event.data.results.length} hasil meja</strong> sudah masuk. Input skor tersedia setelah pembagian babak dikunci.</p><div className="neo-actions"><Link className="neo-button" href={`/tournaments/${event.id}/game`}>Input skor →</Link><Link className="neo-button neo-secondary" href={`/tournaments/${event.id}/standings`}>Klasemen →</Link></div></section>
      <section className="neo-panel"><h2>Rencana kelolosan</h2><p><strong>{settings.advancing} dari {settings.target} peserta</strong> ditargetkan lolos. Setelah seluruh skor lengkap, peserta teratas dapat dikunci dan dibawa ke turnamen baru.</p></section></aside></div>
    <details className="neo-panel neo-disclosure"><summary>Ubah pengaturan turnamen</summary><ActionForm eventId={event.id} version={event.version} operation="settings"><SettingsFields initial={settings} /><label className="neo-check"><input type="checkbox" name="confirm" value="yes" /><span>Saya memahami perubahan jumlah babak atau format dapat membuang draft pembagian yang terdampak. Babak terkunci harus dibuka terlebih dahulu.</span></label><SendButton>Simpan pengaturan</SendButton></ActionForm></details>
    {process.env.REMI_DEV_TOOLS_ENABLED === "true" && participants.length < settings.target && <DevTools eventId={event.id} version={event.version} remaining={settings.target - participants.length} />}
    <details className="neo-panel neo-disclosure"><summary>Riwayat persiapan</summary><ol className="neo-audit">{event.data.audit.slice(-30).reverse().map((entry, index) => <li key={`${entry.at}-${index}`}><time>{entry.at.replace("T", " ").slice(0, 19)} UTC</time><span>{entry.action}</span></li>)}</ol></details></>;
}
