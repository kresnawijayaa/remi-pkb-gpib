"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventRecord } from "@/lib/flexible/model";
import { communityName } from "@/lib/flexible/model";
import { ActionForm, Confirm, SendButton } from "./form";
import { ImportParticipants } from "./import-participants";

export function Participants({ event }: { event: EventRecord }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const locked = event.data.draws.some(draw => draw.locked);
  const visible = event.data.participants.filter(person => `${person.number} ${person.name} ${communityName(event.data, person)}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const shown = useMemo(() => visible.slice((page - 1) * pageSize, page * pageSize), [visible, page]);
  useEffect(() => setPage(1), [query]);
  return <section className="neo-panel"><div className="neo-section-heading"><h2>Daftar peserta</h2><span className="neo-count">{event.data.participants.length}/{event.data.settings.target}</span></div>
    <label className="neo-search">Cari peserta<input type="search" placeholder="Nama, nomor, atau komunitas…" value={query} onChange={input => setQuery(input.target.value)} /></label>
    {locked && <p className="neo-notice">Daftar nama dikunci bersama pembagian meja. Buka kunci dari babak terakhir untuk mengubah daftar.</p>}
    <div className="neo-roster">{shown.map(person => <div className="neo-person" key={person.id}><span className="neo-number">{String(person.number).padStart(2, "0")}</span><div><strong>{person.name}</strong><small>{communityName(event.data, person) || "Tanpa komunitas"}</small></div>{!locked && <details><summary className="neo-text-link">Hapus</summary><ActionForm eventId={event.id} version={event.version} operation="remove"><input type="hidden" name="personId" value={person.id} /><Confirm>Hapus {person.name} dan bersihkan draft pembagian?</Confirm><SendButton secondary>Hapus peserta</SendButton></ActionForm></details>}</div>)}</div>
    {visible.length === 0 && <p className="neo-empty-small">{query ? "Nama tidak ditemukan. Coba kata lain." : "Belum ada nama. Tambahkan peserta di formulir berikut."}</p>}
    {visible.length > pageSize && <nav className="neo-pagination" aria-label="Halaman daftar peserta"><button type="button" className="neo-button neo-secondary" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>← Sebelumnya</button><span><strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visible.length)}</strong> dari {visible.length}</span><button type="button" className="neo-button neo-secondary" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Berikutnya →</button></nav>}
    {!locked && <details className="neo-disclosure" open={event.data.participants.length === 0}><summary>+ Tambah peserta</summary><ActionForm eventId={event.id} version={event.version} operation="participant" resetOnSuccess><label>Nama lengkap<input name="name" minLength={2} maxLength={100} required /></label><label>Komunitas / sektor<select name="communityId" defaultValue=""><option value="">Tanpa komunitas</option>{event.data.communities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{event.data.communities.length === 0 && <p className="neo-hint">Daftarkan komunitas / sektor terlebih dahulu dari menu pengelolaan komunitas.</p>}<SendButton>Tambahkan peserta</SendButton></ActionForm></details>}
    {!locked && <ImportParticipants eventId={event.id} version={event.version} />}
  </section>;
}
