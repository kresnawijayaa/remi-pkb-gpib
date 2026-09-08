"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Draw, Person } from "@/lib/flexible/model";

type PublicPerson = Person & { community: string };

export function PublicBoard({ name, participants, draws }: { name: string; participants: PublicPerson[]; draws: Draw[] }) {
  const [query, setQuery] = useState("");
  const [round, setRound] = useState(draws[0]?.number ?? 1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const chosen = draws.find(draw => draw.number === round) ?? draws[0];
  const people = new Map(participants.map(person => [person.id, person]));
  const matches = participants.filter(person => `${person.name} ${person.number} ${person.community}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><header className="neo-page-heading"><span className="neo-eyebrow">PEMBAGIAN RESMI PANITIA</span><h1>{name}</h1><p>Cari nama Anda. Lihat meja untuk setiap babak yang sudah dikunci.</p></header><div className="neo-public-search"><label>Cari nama / nomor peserta<input autoComplete="off" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ketik nama Anda di sini…" /></label><button className="neo-button neo-secondary" type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Memuat…" : "↻ Perbarui jadwal"}</button></div>
    {draws.length === 0 ? <div className="neo-empty"><h2>Jadwal sedang diperbarui.</h2><p>Belum ada pembagian terkunci yang dipublikasikan. Hubungi panitia atau perbarui halaman nanti.</p></div> : query.trim() ? <section aria-live="polite"><p className="neo-hint">{matches.length} peserta ditemukan</p>{matches.length === 0 && <p className="neo-empty-small">Nama belum ditemukan. Coba nomor peserta atau tanyakan kepada panitia.</p>}<div className="neo-public-results">{matches.map(person => <article className="neo-panel" key={person.id}><span className="neo-tag">PESERTA #{person.number}</span><h2>{person.name}</h2><p>{person.community || "Tanpa komunitas"}</p><div className="neo-schedule">{draws.map(draw => { const tableIndex = draw.tables.findIndex(table => table.includes(person.id)); return <div key={draw.number}><span>Babak {draw.number}</span><strong>{tableIndex < 0 ? "Belum tersedia" : `Meja ${String(tableIndex + 1).padStart(2, "0")}`}</strong><small>Revisi {draw.revision}</small></div>; })}</div></article>)}</div></section> : <><div className="neo-section-heading"><h2>Semua meja</h2><label>Babak<select value={chosen?.number ?? ""} onChange={event => setRound(Number(event.target.value))}>{draws.map(draw => <option key={draw.number} value={draw.number}>Babak {draw.number} · Revisi {draw.revision}</option>)}</select></label></div><div className="neo-tables">{chosen?.tables.map((table, index) => <article className="neo-table" key={index}><header><h3>MEJA <b>{String(index + 1).padStart(2, "0")}</b></h3><span>Babak {chosen.number}</span></header><ol>{table.map((id, seat) => <li key={id}><span className="neo-seat">{seat + 1}</span><div><strong>{people.get(id)?.name}</strong><small>#{people.get(id)?.number} · {people.get(id)?.community || "Tanpa komunitas"}</small></div></li>)}</ol></article>)}</div></>}
    <p className="neo-footnote">Halaman ini tidak memuat skor atau kontak peserta. Jadwal dapat dikoreksi panitia; perbarui halaman sebelum bermain.</p></>;
}
