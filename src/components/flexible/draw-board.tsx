"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  communityName,
  isRoundResultLocked,
  reviewDraw,
  reviewTierDraw,
  type Draw,
  type EventRecord,
} from "@/lib/flexible/model";
import { ActionForm, Confirm, SendButton } from "./form";

function generationLabel(draw: Draw) {
  if (draw.generation === "tier") return "Shuffle Tier";
  if (draw.generation === "seeded") return "Pot peringkat awal";
  return "Shuffle Rotasi";
}

function GenerateActions({ event, round, disabled = false, compact = false }: { event: EventRecord; round: number; disabled?: boolean; compact?: boolean }) {
  const tierReady = round > 1 && isRoundResultLocked(event.data, round - 1);
  return <div className={compact ? "neo-actions" : "neo-shuffle-modes"}>
    <ActionForm eventId={event.id} version={event.version} operation="generate" round={round}>
      {!compact && <div className="neo-shuffle-mode"><span className="neo-tag neo-blue">FLEKSIBEL</span><h3>Shuffle Rotasi</h3><p>Bisa dibuat lebih awal. Sistem mengurangi pertemuan ulang dan peserta satu komunitas.</p></div>}
      <SendButton secondary={compact} disabled={disabled}>{compact ? "↻ Shuffle Rotasi" : "Buat dengan Shuffle Rotasi"}</SendButton>
    </ActionForm>
    {round > 1 && <ActionForm eventId={event.id} version={event.version} operation="generate-tier" round={round}>
      {!compact && <div className="neo-shuffle-mode neo-tier-mode"><span className="neo-tag neo-yellow-tag">KOMPETITIF</span><h3>Shuffle Tier</h3><p>Kelompokkan Top 2 dan Pengejar berdasarkan hasil babak sebelumnya. Hasil babak tersebut harus dikunci.</p></div>}
      <SendButton disabled={disabled || !tierReady}>{compact ? "◆ Shuffle Tier" : "Buat dengan Shuffle Tier"}</SendButton>
      {!tierReady && !compact && <small>Kunci hasil babak {round - 1} untuk mengaktifkan mode ini.</small>}
    </ActionForm>}
    {event.data.parentId && <ActionForm eventId={event.id} version={event.version} operation="generate-seeded" round={round}>
      {!compact && <div className="neo-shuffle-mode"><span className="neo-tag neo-green">TAHAP BARU</span><h3>Pot peringkat awal</h3><p>Sebarkan peserta unggulan dari klasemen tahap sebelumnya ke meja yang berbeda.</p></div>}
      <SendButton secondary disabled={disabled}>{compact ? "↻ Pot peringkat" : "Buat dari pot peringkat"}</SendButton>
    </ActionForm>}
  </div>;
}

export function DrawBoard({ event, selected }: { event: EventRecord; selected: number }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { settings, participants, draws } = event.data;
  const draw = draws.find(item => item.number === selected);
  const previous = draws.filter(item => item.number < selected && item.locked);
  const ready = participants.length === settings.target && previous.length === selected - 1;
  const people = new Map(participants.map(person => [person.id, person]));
  const review = draw ? reviewDraw(draw.tables, participants, previous) : null;
  const tierReview = draw?.generation === "tier" ? reviewTierDraw(event.data, draw) : null;
  const tierSourceDraw = draw?.tier ? draws.find(item => item.number === draw.tier?.sourceRound) : undefined;
  const tierSourceTables = new Map<string, number>(Object.entries(draw?.tier?.sourceTables ?? {}).map(([id, table]) => [id, table]));
  tierSourceDraw?.tables.forEach((table, tableIndex) => table.forEach(id => { if (!tierSourceTables.has(id)) tierSourceTables.set(id, tableIndex + 1); }));
  const lockedLater = draws.some(item => item.number > selected && item.locked);
  const visible = draw?.tables.map((table, index) => ({ table, number: index + 1 })).filter(({ table, number }) => !query || String(number) === query || table.some(id => { const person = people.get(id); return person && `${person.number} ${person.name} ${communityName(event.data, person)}`.toLowerCase().includes(query.toLowerCase()); }));

  return <>
    <div className="neo-round-tabs" aria-label="Pilih babak">{Array.from({ length: settings.rounds }, (_, index) => { const number = index + 1; const current = draws.find(item => item.number === number); return <Link key={number} href={`?round=${number}`} aria-current={selected === number ? "page" : undefined} className={selected === number ? "selected" : ""}><span>Babak {String(number).padStart(2, "0")}</span><small>{current?.locked ? "✓ Dikunci" : current ? "Draft" : "Belum dibuat"}</small></Link>; })}</div>
    <div className="neo-section-heading"><div><span className={`neo-tag ${draw?.locked ? "neo-green" : "neo-blue"}`}>{draw?.locked ? "PEMBAGIAN DIKUNCI" : "RUANG REVIEW"}</span><h2>Babak {selected} <small>/ {settings.rounds}</small></h2></div><span className="neo-hint">{draw ? `Revisi ${draw.revision} · ${draw.tables.length} meja · ${generationLabel(draw)}` : selected === 1 ? "Mulai dengan Shuffle Rotasi" : "Pilih mode shuffle"}</span></div>
    {!draw ? <section className="neo-empty neo-draw-empty"><span className="neo-empty-symbol" aria-hidden="true">♠</span><h3>Mejanya belum disusun.</h3><p>{ready ? "Pilih cara penyusunan meja yang sesuai dengan kondisi pertandingan." : participants.length !== settings.target ? "Lengkapi daftar nama atau sesuaikan target peserta sebelum membuat pembagian." : "Kunci pembagian babak sebelumnya terlebih dahulu."}</p><GenerateActions event={event} round={selected} disabled={!ready} /></section> : <>
      <div className="neo-draw-toolbar"><label className="neo-search">Cari meja atau peserta<input type="search" value={query} onChange={input => setQuery(input.target.value)} placeholder="Nama, nomor peserta, atau meja…" /></label>{!draw.locked && <GenerateActions event={event} round={selected} compact />}<button className="neo-button neo-secondary" type="button" onClick={() => router.refresh()}>Muat ulang</button></div>
      {tierReview && <section className={`neo-tier-review ${tierReview.topPairRematches > 0 ? "has-conflict" : ""}`} aria-label="Review Shuffle Tier"><div><span className="neo-eyebrow">REVIEW SHUFFLE TIER</span><h3>{tierReview.topPairRematches === 0 ? "Top 2 dari meja yang sama sudah dipisah." : "Ada pasangan Top 2 yang bertemu kembali."}</h3><p>Tier dibuat dari peringkat babak {draw.tier?.sourceRound}. Meja campuran dipakai hanya saat komposisi peserta memerlukannya.</p></div><dl><div><dt>Meja Top</dt><dd>{tierReview.pureTopTables}</dd></div><div><dt>Meja Pengejar</dt><dd>{tierReview.pureChaserTables}</dd></div><div><dt>Campuran</dt><dd>{tierReview.mixedTables}</dd></div><div><dt>Satu komunitas</dt><dd>{tierReview.sameCommunity}</dd></div></dl></section>}
      {review && draw.generation !== "tier" && <div className="neo-notice" role="status"><strong>Review rotasi:</strong> {review.repeats} pertemuan berulang · {review.sameCommunity} pasangan satu komunitas.{review.penalty === 0 ? " Tidak ada konflik terdeteksi." : " Periksa susunan; pembagian sempurna mungkin tidak tersedia untuk komposisi peserta ini."}{draw.tables.some(table => table.length < settings.capacity) && " Ada meja tidak penuh; jumlah pemain sudah diseimbangkan."}</div>}
      <div className="neo-tables">{visible?.map(({ table, number }) => { const tierTable = tierReview?.tables[number - 1]; const tierClass = tierTable ? tierTable.top === table.length ? "is-tier-top" : tierTable.chaser === table.length ? "is-tier-chaser" : "is-tier-mixed" : ""; return <article className={`neo-table ${tierClass}`} key={number}><header><h3>MEJA <b>{String(number).padStart(2, "0")}</b></h3><span>{tierTable ? `${tierTable.top} Top · ${tierTable.chaser} Pengejar` : `${table.length}/${settings.capacity} orang`}</span></header><ol>{table.map((id, index) => { const person = people.get(id); const sourceRank = draw.tier?.sourceRanks[id]; const sourceTable = tierSourceTables.get(id); return <li key={id}><span className="neo-seat">{index + 1}</span><div><strong>{person?.name ?? "Peserta tidak ditemukan"}</strong><small>#{person?.number} · {person ? communityName(event.data, person) || "Tanpa komunitas" : ""}</small>{sourceRank && <span className={`neo-tier-mark ${sourceRank <= 2 ? "is-top" : "is-chaser"}`}>{sourceRank <= 2 ? "TOP" : "PENGEJAR"} · P{sourceRank}{sourceTable ? ` · MEJA ${sourceTable}` : ""} · BABAK {draw.tier?.sourceRound}</span>}</div></li>; })}</ol></article>; })}</div>{visible?.length === 0 && <p className="neo-empty-small">Tidak ada meja atau nama yang cocok.</p>}
      {!draw.locked ? <div className="neo-two-col"><section className="neo-panel"><h3>Tukar peserta</h3><p>Pilih dua nama. Pada Shuffle Tier, perubahan manual dapat memengaruhi pemisahan Top 2 dan komposisi tier.</p><ActionForm eventId={event.id} version={event.version} operation="swap" round={selected}><div className="neo-fields">{["first", "second"].map((field, index) => <label key={field}>Peserta {index + 1}<select name={field} required defaultValue=""><option value="" disabled>Pilih peserta…</option>{draw.tables.flatMap((table, tableIndex) => table.map(id => <option value={id} key={id}>Meja {tableIndex + 1} · #{people.get(id)?.number} {people.get(id)?.name}</option>))}</select></label>)}</div><SendButton secondary>Tukar posisi</SendButton></ActionForm></section><section className="neo-panel neo-yellow"><h3>Sudah cocok? Kunci pembagiannya.</h3><p>Periksa susunan, komunitas, dan—untuk Shuffle Tier—pemisahan Top 2 sebelum pembagian ditampilkan.</p><ActionForm eventId={event.id} version={event.version} operation="lock" round={selected}><Confirm>Saya sudah memeriksa peserta dan peringatan pembagian. Susunan ini boleh tampil pada link publik yang aktif.</Confirm><SendButton>Kunci pembagian babak {selected}</SendButton></ActionForm></section></div> : <section className="neo-panel neo-locked"><div><h3>✓ Susunan aman. Siap dimainkan.</h3><p>Masukkan skor saat meja selesai bermain. Untuk memakai Shuffle Tier berikutnya, lengkapi lalu kunci hasil babak ini.</p><div className="neo-actions"><Link href={`/tournaments/${event.id}/game?round=${selected}`} className="neo-button neo-dark">Input skor babak {selected} →</Link>{selected < settings.rounds && <Link href={`?round=${selected + 1}`} className="neo-button">Siapkan babak {selected + 1} →</Link>}</div></div><details className="neo-disclosure"><summary>Perlu koreksi pembagian?</summary>{lockedLater ? <p>Buka kunci dari babak terakhir terlebih dahulu.</p> : <ActionForm eventId={event.id} version={event.version} operation="unlock" round={selected}><Confirm>Tarik babak ini dari link publik dan buang draft berikutnya. Saya akan memberi tahu peserta jika jadwal berubah.</Confirm><SendButton secondary>Buka kunci untuk koreksi</SendButton></ActionForm>}</details></section>}
    </>}
  </>;
}
