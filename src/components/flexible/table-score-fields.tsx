"use client";

import { useState } from "react";
import { scoreEntryState, reconcileManualRanks } from "@/lib/flexible/score-entry";
import type { ScoreEntry } from "@/lib/flexible/model";
import { SendButton } from "./form";

export function TableScoreFields({ people, saved, readOnly, table, round }: { people: { id: string; name: string; number: number; community: string }[]; saved: ScoreEntry[]; readOnly: boolean; table: number; round: number }) {
  const [inputs, setInputs] = useState(() => people.map(person => ({ id: person.id, score: String(saved.find(item => item.participantId === person.id)?.score ?? "") })));
  const [manual, setManual] = useState<Record<string, string>>(() => Object.fromEntries(saved.map(item => [item.participantId, String(item.tableRank)])));
  const state = scoreEntryState(inputs, manual);
  const hintId = `score-hint-${round}-${table}`;
  const tied = state.rows.some(row => row.tied);

  function updateScore(id: string, score: string) {
    const next = inputs.map(item => item.id === id ? { ...item, score } : item);
    setManual(reconcileManualRanks(inputs, next, manual));
    setInputs(next);
  }

  return <>
    <p id={hintId} className={`neo-score-hint ${tied && !readOnly ? "has-ties" : ""}`} role="status">{readOnly ? "Skor dan peringkat meja sudah dikunci." : !state.complete ? "Isi semua skor meja. Peringkat akan dihitung otomatis setelah seluruh skor terisi." : tied ? state.valid ? "Peringkat seri sudah lengkap. Periksa sebelum menyimpan." : "Ada skor sama. Tentukan peringkat peserta yang ditandai; setiap peringkat harus berbeda." : "Tidak ada skor seri. Semua peringkat dihitung otomatis."}</p>
    <div className="neo-score-list">{people.map((person, index) => {
      const row = state.rows[index];
      const used = new Set(state.rows.filter(other => other.id !== person.id && other.tied).map(other => other.rank));
      return <div className={`neo-score-row ${row.tied && !readOnly ? "is-tied" : ""}`} key={person.id}>
        <div><strong>{person.name}</strong><small>#{person.number} · {person.community}</small>{row.rank && <span className="neo-rank">Peringkat {row.rank} · {6 - Number(row.rank)} poin</span>}{row.tied && !readOnly && <span className="neo-tie-label">Skor sama — tentukan peringkat</span>}</div>
        <label>Skor<input name={`score-${person.id}`} aria-label={`Skor ${person.name}`} type="number" min={-999999} max={999999} step={1} required value={inputs[index].score} onChange={event => updateScore(person.id, event.target.value)} disabled={readOnly} /></label>
        <label>Peringkat meja<small>{row.tied ? "Pilihan manual panitia" : state.complete ? "Otomatis dari skor" : "Menunggu semua skor"}</small><select aria-label={`Peringkat meja ${person.name}`} aria-describedby={hintId} value={row.rank} disabled={readOnly || !state.complete || !row.tied} required={row.tied && !readOnly} onChange={event => setManual({ ...manual, [person.id]: event.target.value })}><option value="">{row.tied ? "Pilih peringkat" : "—"}</option>{row.options.map(rank => <option key={rank} value={rank} disabled={used.has(String(rank))}>Peringkat {rank}</option>)}</select></label>
        {!readOnly && <input type="hidden" name={`rank-${person.id}`} value={row.rank} />}
      </div>;
    })}</div>
    {!readOnly && <SendButton disabled={!state.valid}>{saved.length ? "Perbarui skor meja" : "Simpan skor meja"}</SendButton>}
  </>;
}
