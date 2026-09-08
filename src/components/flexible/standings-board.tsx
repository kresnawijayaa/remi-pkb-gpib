import type { EventRecord } from "@/lib/flexible/model";
import { communityName } from "@/lib/flexible/model";
import { calculateStandings, expectedTableCount, scoringComplete } from "@/lib/flexible/scoring";
import { ActionForm, Confirm, SendButton } from "./form";

export function StandingsBoard({ event }: { event: EventRecord }) {
  const standings = calculateStandings(event.data);
  const people = new Map(event.data.participants.map(person => [person.id, person]));
  const complete = scoringComplete(event.data);
  const expected = expectedTableCount(event.data);
  const qualificationLocked = Boolean(event.data.qualificationLockedAt);
  const qualified = new Set(event.data.qualifiedIds);

  return <>
    <section className="neo-panel">
      <div className="neo-section-heading"><div><span className={`neo-tag ${complete ? "neo-green" : "neo-blue"}`}>{complete ? "SKOR LENGKAP" : "BERJALAN"}</span><h2>Klasemen keseluruhan</h2></div><span className="neo-count">{event.data.results.length}/{expected} meja</span></div>
      <p className="neo-hint"><strong>Poin tiap babak:</strong> 🥇 5 · 🥈 4 · 🥉 3 · 4️⃣ 2 · 5️⃣ 1. <strong>Urutan klasemen:</strong> poin terbesar, lalu jumlah 🥇, 🥈, 🥉 terbanyak, dan total skor terbesar.</p>
      <div className="neo-table-scroll"><table className="neo-standings"><thead><tr><th>Rank</th><th>Peserta</th><th>Main</th><th title="Peringkat 1">🥇</th><th title="Peringkat 2">🥈</th><th title="Peringkat 3">🥉</th><th>Poin</th><th>Total skor</th><th>Status</th></tr></thead><tbody>{standings.map((row, index) => {
        const person = people.get(row.participantId);
        const isQualified = qualified.has(row.participantId);
        const isQualificationZone = !qualificationLocked && index < event.data.settings.advancing;
        return <tr key={row.participantId} className={isQualified ? "is-qualified" : isQualificationZone ? "is-qualification-zone" : ""}><td><strong>{index + 1}</strong></td><td><strong>{person?.name}</strong><small>#{person?.number} · {person ? communityName(event.data, person) || "Tanpa komunitas" : ""}</small></td><td>{row.completedRounds}/{event.data.settings.rounds}</td><td><strong>{row.firsts}</strong></td><td>{row.seconds}</td><td>{row.thirds}</td><td><strong>{row.totalPoint}</strong></td><td>{row.totalScore}</td><td>{isQualified ? <span className="neo-tag neo-green">LOLOS</span> : qualificationLocked ? "—" : isQualificationZone ? "Zona lolos" : "—"}</td></tr>;
      })}</tbody></table></div>
      {standings.length === 0 && <p className="neo-empty-small">Belum ada skor yang masuk.</p>}
    </section>
    <div className="neo-two-col neo-qualification">
      <section className="neo-panel neo-yellow"><span className="neo-eyebrow">TARGET KELOLOSAN</span><h2>{event.data.settings.advancing} peserta terbaik</h2>{qualificationLocked ? <><p>Daftar peserta lolos sudah dikunci dan siap dibawa ke tahap berikutnya.</p><details className="neo-disclosure"><summary>Perlu koreksi skor?</summary><ActionForm eventId={event.id} version={event.version} operation="qualification-unlock"><Confirm>Buka kembali kelolosan agar skor dapat diperbaiki.</Confirm><SendButton secondary>Buka kelolosan</SendButton></ActionForm></details></> : <><p>{complete ? "Semua skor lengkap. Periksa klasemen sebelum mengunci." : `Masih ada ${Math.max(0, expected - event.data.results.length)} hasil meja yang belum masuk.`}</p><ActionForm eventId={event.id} version={event.version} operation="qualification-lock"><Confirm>Saya sudah memeriksa klasemen. Peserta pada zona lolos boleh dikunci.</Confirm><SendButton disabled={!complete}>Kunci peserta lolos</SendButton></ActionForm></>}</section>
      <section className="neo-panel"><span className="neo-eyebrow">TAHAP LANJUTAN</span><h2>Buat turnamen berikutnya</h2><p>Salin peserta yang lolos ke turnamen fleksibel baru. Turnamen ini tetap tersimpan sebagai arsip hasil.</p>{qualificationLocked && event.data.qualifiedIds.length >= 2 ? <ActionForm eventId={event.id} version={event.version} operation="create-stage"><label>Nama tahap baru<input name="name" defaultValue={`${event.data.settings.name} · Tahap 2`} required maxLength={100} /></label><div className="neo-fields"><label>Maksimal per meja<input name="capacity" type="number" min="2" max="10" defaultValue={Math.min(5, event.data.qualifiedIds.length)} required /></label><label>Jumlah babak<input name="rounds" type="number" min="1" max="20" defaultValue="1" required /></label><label>Peserta lolos berikutnya<input name="advancing" type="number" min="1" max={event.data.qualifiedIds.length} defaultValue={Math.max(1, Math.floor(event.data.qualifiedIds.length / 2))} required /></label></div><Confirm>Buat turnamen baru dengan {event.data.qualifiedIds.length} peserta lolos.</Confirm><SendButton>Buat tahap lanjutan →</SendButton></ActionForm> : <p className="neo-notice">Kunci minimal 2 peserta lolos untuk membuat tahap lanjutan.</p>}</section>
    </div>
  </>;
}
