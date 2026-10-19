
import { Icon, IconText } from "@/components/icon";
import Link from "next/link";
import type { EventRecord } from "@/lib/flexible/model";
import { communityName, isRoundResultLocked, roundScoringComplete } from "@/lib/flexible/model";
import { resultFor } from "@/lib/flexible/scoring";
import { ActionForm, Confirm, SendButton } from "./form";
import { TableScoreFields } from "./table-score-fields";

export function GameBoard({ event, selected }: { event: EventRecord; selected: number }) {
  const draw = event.data.draws.find(item => item.number === selected && item.locked);
  const people = new Map(event.data.participants.map(person => [person.id, person]));
  const qualificationLocked = Boolean(event.data.qualificationLockedAt);
  const scoreLocked = isRoundResultLocked(event.data, selected);
  const readOnly = qualificationLocked || scoreLocked;
  const complete = roundScoringComplete(event.data, selected);
  const dependentDraws = event.data.draws.filter(item => item.generation === "tier" && item.tier?.sourceRound === selected);
  const lockedDependent = dependentDraws.find(item => item.locked);
  const completedTables = draw?.tables.filter((_, tableIndex) => resultFor(event.data, selected, tableIndex + 1)).length ?? 0;

  return <>
    <div className="neo-round-tabs" aria-label="Pilih babak">{Array.from({ length: event.data.settings.rounds }, (_, index) => {
      const number = index + 1;
      const roundDraw = event.data.draws.find(item => item.number === number && item.locked);
      const completed = roundDraw?.tables.filter((_, tableIndex) => resultFor(event.data, number, tableIndex + 1)).length ?? 0;
      return <Link key={number} href={`?round=${number}`} aria-current={selected === number ? "page" : undefined} className={selected === number ? "selected" : ""}><span>Babak {String(number).padStart(2, "0")}</span><small>{isRoundResultLocked(event.data, number) ? <IconText>{"✓ Hasil dikunci"}</IconText> : roundDraw ? `${completed}/${roundDraw.tables.length} meja masuk` : "Pembagian belum dikunci"}</small></Link>;
    })}</div>
    {qualificationLocked && <p className="neo-notice neo-success">Kelolosan sudah dikunci. Skor ditampilkan sebagai arsip dan tidak dapat diubah.</p>}
    {!draw ? <section className="neo-empty"><h2>Pembagian belum dikunci.</h2><p>Kunci pembagian babak ini sebelum memasukkan skor.</p><Link className="neo-button" href={`/tournaments/${event.id}/draws?round=${selected}`}>Buka pembagian <Icon name="right" /></Link></section> : <>
      <div className="neo-score-grid">{draw.tables.map((table, tableIndex) => {
        const tableNumber = tableIndex + 1;
        const result = resultFor(event.data, selected, tableNumber);

        return <article className={`neo-panel neo-score-card ${result ? "is-complete" : ""}`} key={tableNumber}>
          <div className="neo-section-heading"><div><span className={`neo-tag ${result ? "neo-green" : "neo-blue"}`}>{result ? "SUDAH MASUK" : "BELUM DIISI"}</span><h2>Meja {String(tableNumber).padStart(2, "0")}</h2></div>{result && <span className="neo-count"><Icon name="check" /></span>}</div>
          <ActionForm eventId={event.id} version={event.version} operation="score-table" round={selected}><input type="hidden" name="table" value={tableNumber} /><TableScoreFields key={JSON.stringify([selected, table, result?.scores ?? [], readOnly])} round={selected} table={tableNumber} readOnly={readOnly} saved={result?.scores ?? []} people={table.map(id => { const person = people.get(id); return { id, name: person?.name ?? "Peserta tidak ditemukan", number: person?.number ?? 0, community: person ? communityName(event.data, person) || "Tanpa komunitas" : "" }; })} /></ActionForm>
          {result && !readOnly && <details className="neo-disclosure"><summary>Hapus hasil meja</summary><ActionForm eventId={event.id} version={event.version} operation="score-clear" round={selected}><input type="hidden" name="table" value={tableNumber} /><Confirm>Hapus seluruh skor meja ini untuk diisi ulang.</Confirm><SendButton secondary>Hapus skor</SendButton></ActionForm></details>}
        </article>;
      })}</div>
      <section id="round-results" className={`neo-result-lock ${scoreLocked ? "is-locked" : ""}`}><div><span className="neo-eyebrow">STATUS HASIL BABAK {selected}</span><h2>{scoreLocked ? `Hasil babak ${selected} sudah dikunci` : complete ? "Semua meja sudah masuk" : `${completedTables}/${draw.tables.length} meja sudah masuk`}</h2><p>{scoreLocked ? selected < event.data.settings.rounds ? "Skor babak ini sudah disahkan dan dapat menjadi dasar Shuffle Tier berikutnya." : "Skor babak terakhir sudah disahkan. Periksa klasemen untuk menetapkan peserta lolos." : complete ? "Periksa skor dan peringkat meja, lalu kunci agar hasil tidak berubah saat pembagian berikutnya dibuat." : `Lengkapi ${draw.tables.length - completedTables} meja lagi sebelum hasil dapat dikunci.`}</p>{scoreLocked && selected < event.data.settings.rounds && <Link className="neo-button neo-dark" href={`/tournaments/${event.id}/draws?round=${selected + 1}`}>Siapkan babak {selected + 1} <Icon name="right" /></Link>}{scoreLocked && selected === event.data.settings.rounds && <Link className="neo-button neo-dark" href={`/tournaments/${event.id}/standings`}>Periksa klasemen dan kelolosan <Icon name="right" /></Link>}</div>{!qualificationLocked && (scoreLocked ? <details className="neo-disclosure"><summary>Perlu koreksi hasil?</summary><ActionForm eventId={event.id} version={event.version} operation="result-unlock" round={selected}><p>{lockedDependent ? `Pembagian Tier babak ${lockedDependent.number} memakai hasil babak ${selected}. Buka kunci pembagian tersebut lebih dahulu.` : dependentDraws.length ? `Membuka hasil babak ${selected} akan menghapus draf Shuffle Tier babak ${dependentDraws.map(item => item.number).join(", ")}. Buat ulang pembagian setelah skor diperbaiki dan hasil dikunci kembali.` : `Membuka hasil babak ${selected} mengizinkan koreksi skor. Skor yang tersimpan tidak dihapus.`}</p><Confirm>Saya memahami dampaknya dan ingin membuka kunci hasil babak {selected}.</Confirm><SendButton secondary disabled={Boolean(lockedDependent)}>Buka kunci hasil babak {selected}</SendButton></ActionForm></details> : <ActionForm eventId={event.id} version={event.version} operation="result-lock" round={selected}><Confirm>Saya sudah memeriksa seluruh skor dan peringkat meja. Hasil babak ini boleh menjadi dasar Shuffle Tier.</Confirm><SendButton disabled={!complete}>Kunci hasil babak {selected}</SendButton></ActionForm>)}</section>
    </>}
  </>;
}
