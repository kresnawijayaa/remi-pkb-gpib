import Link from "next/link";
import type { EventRecord } from "@/lib/flexible/model";
import { communityName, isRoundResultLocked, roundScoringComplete } from "@/lib/flexible/model";
import { resultFor } from "@/lib/flexible/scoring";
import { ActionForm, Confirm, SendButton } from "./form";

export function GameBoard({ event, selected }: { event: EventRecord; selected: number }) {
  const draw = event.data.draws.find(item => item.number === selected && item.locked);
  const people = new Map(event.data.participants.map(person => [person.id, person]));
  const qualificationLocked = Boolean(event.data.qualificationLockedAt);
  const scoreLocked = isRoundResultLocked(event.data, selected);
  const readOnly = qualificationLocked || scoreLocked;
  const complete = roundScoringComplete(event.data, selected);
  const completedTables = draw?.tables.filter((_, tableIndex) => resultFor(event.data, selected, tableIndex + 1)).length ?? 0;

  return <>
    <div className="neo-round-tabs" aria-label="Pilih babak">{Array.from({ length: event.data.settings.rounds }, (_, index) => {
      const number = index + 1;
      const roundDraw = event.data.draws.find(item => item.number === number && item.locked);
      const completed = roundDraw?.tables.filter((_, tableIndex) => resultFor(event.data, number, tableIndex + 1)).length ?? 0;
      return <Link key={number} href={`?round=${number}`} className={selected === number ? "selected" : ""}><span>Babak {String(number).padStart(2, "0")}</span><small>{isRoundResultLocked(event.data, number) ? "✓ Hasil dikunci" : roundDraw ? `${completed}/${roundDraw.tables.length} meja masuk` : "Pembagian belum dikunci"}</small></Link>;
    })}</div>
    {qualificationLocked && <p className="neo-notice neo-success">Kelolosan sudah dikunci. Skor ditampilkan sebagai arsip dan tidak dapat diubah.</p>}
    {!draw ? <section className="neo-empty"><h2>Pembagian belum dikunci.</h2><p>Kunci pembagian babak ini sebelum memasukkan skor.</p><Link className="neo-button" href={`/tournaments/${event.id}/draws?round=${selected}`}>Buka pembagian →</Link></section> : <>
      <div className="neo-score-grid">{draw.tables.map((table, tableIndex) => {
        const tableNumber = tableIndex + 1;
        const result = resultFor(event.data, selected, tableNumber);
        const scores = new Map(result?.scores.map(score => [score.participantId, score]));
        return <article className={`neo-panel neo-score-card ${result ? "is-complete" : ""}`} key={tableNumber}>
          <div className="neo-section-heading"><div><span className={`neo-tag ${result ? "neo-green" : "neo-blue"}`}>{result ? "SUDAH MASUK" : "BELUM DIISI"}</span><h2>Meja {String(tableNumber).padStart(2, "0")}</h2></div>{result && <span className="neo-count">✓</span>}</div>
          <ActionForm eventId={event.id} version={event.version} operation="score-table" round={selected}><input type="hidden" name="table" value={tableNumber} /><div className="neo-score-list">{table.map(participantId => {
            const person = people.get(participantId);
            const score = scores.get(participantId);
            return <div className="neo-score-row" key={participantId}><div><strong>{person?.name}</strong><small>#{person?.number} · {person ? communityName(event.data, person) || "Tanpa komunitas" : ""}</small>{score && <span className="neo-rank">Peringkat {score.tableRank} · {score.tournamentPoint} poin</span>}</div><label>Skor<input name={`score-${participantId}`} type="number" required defaultValue={score?.score ?? ""} disabled={readOnly} /></label><label>Urutan seri <small>hanya jika skor sama</small><input name={`rank-${participantId}`} type="number" min="1" max={table.length} disabled={readOnly} /></label></div>;
          })}</div>{!readOnly && <SendButton>{result ? "Perbarui skor meja" : "Simpan skor meja"}</SendButton>}</ActionForm>
          {result && !readOnly && <details className="neo-disclosure"><summary>Hapus hasil meja</summary><ActionForm eventId={event.id} version={event.version} operation="score-clear" round={selected}><input type="hidden" name="table" value={tableNumber} /><Confirm>Hapus seluruh skor meja ini untuk diisi ulang.</Confirm><SendButton secondary>Hapus skor</SendButton></ActionForm></details>}
        </article>;
      })}</div>
      <section className={`neo-result-lock ${scoreLocked ? "is-locked" : ""}`}><div><span className="neo-eyebrow">STATUS HASIL BABAK {selected}</span><h2>{scoreLocked ? "Hasil sudah dikunci" : complete ? "Semua meja sudah masuk" : `${completedTables}/${draw.tables.length} meja sudah masuk`}</h2><p>{scoreLocked ? "Hasil ini dapat dipakai Shuffle Tier pada babak berikutnya." : complete ? "Periksa skor dan urutan seri, lalu kunci agar hasil tidak berubah saat pembagian berikutnya dibuat." : `Lengkapi ${draw.tables.length - completedTables} meja lagi sebelum hasil dapat dikunci.`}</p>{scoreLocked && selected < event.data.settings.rounds && <Link className="neo-button neo-dark" href={`/tournaments/${event.id}/draws?round=${selected + 1}`}>Siapkan babak {selected + 1} →</Link>}</div>{!qualificationLocked && (scoreLocked ? <details className="neo-disclosure"><summary>Perlu koreksi hasil?</summary><ActionForm eventId={event.id} version={event.version} operation="result-unlock" round={selected}><Confirm>Buka hasil babak ini. Draft Shuffle Tier yang bergantung pada hasil ini akan dibatalkan; pembagian yang sudah dikunci harus dibuka lebih dahulu.</Confirm><SendButton secondary>Buka kunci hasil</SendButton></ActionForm></details> : <ActionForm eventId={event.id} version={event.version} operation="result-lock" round={selected}><Confirm>Saya sudah memeriksa seluruh skor dan urutan seri. Hasil babak ini boleh menjadi dasar Shuffle Tier.</Confirm><SendButton disabled={!complete}>Kunci hasil babak {selected}</SendButton></ActionForm>)}</section>
    </>}
  </>;
}
