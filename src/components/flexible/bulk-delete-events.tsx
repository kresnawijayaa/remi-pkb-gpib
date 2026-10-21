"use client";

import { useActionState, useEffect, useState } from "react";
import { bulkDeleteEvents, type BulkDeleteState } from "@/app/tournaments/bulk-delete-actions";
import type { DeletionCandidate } from "@/lib/flexible/bulk-delete";

export function BulkDeleteEvents({ events }: { events: DeletionCandidate[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(bulkDeleteEvents, {} as BulkDeleteState);
  const chosen = events.filter(event => selected.includes(event.id));
  const missingChildren = events.filter(event => event.parentId && selected.includes(event.parentId) && !selected.includes(event.id));
  useEffect(() => { if (state.message) { setSelected([]); setConfirmation(""); } }, [state]);
  return <details id="developer-bulk-delete" className="neo-panel neo-bulk-delete">
    <summary><strong>Developer: hapus massal turnamen</strong></summary>
    <p>Hanya turnamen versi sekarang. Pilih turnamen yang ingin dibersihkan; arsip REMI lama tetap disimpan.</p>
    <form action={action} className="neo-form" aria-busy={pending}>
      <fieldset disabled={pending}>
        <div className="neo-actions"><button type="button" className="neo-button neo-secondary" disabled={!events.length} onClick={() => { setSelected(events.map(event => event.id)); setConfirmation(""); }}>Pilih semua ({events.length})</button><button type="button" className="neo-button neo-secondary" disabled={!selected.length} onClick={() => { setSelected([]); setConfirmation(""); }}>Batalkan pilihan</button></div>
        <div className="neo-bulk-options">{events.length ? events.map(event => <label className="neo-check" key={event.id}><input type="checkbox" checked={selected.includes(event.id)} onChange={change => { setSelected(ids => change.target.checked ? [...ids, event.id] : ids.filter(id => id !== event.id)); setConfirmation(""); }} /><span><strong>{event.name}</strong><small>{event.participants} peserta{event.parentId ? " · Tahap lanjutan" : ""}</small></span></label>) : <p>Tidak ada turnamen yang dapat dihapus.</p>}</div>
        {chosen.length > 0 && <>
          <div className="neo-notice neo-error"><strong>{chosen.length} turnamen akan dihapus permanen:</strong><ul>{chosen.map(event => <li key={event.id}>{event.name}</li>)}</ul><p>Seluruh peserta, komunitas, pembagian meja, skor, dan riwayat di turnamen terpilih ikut dihapus. Link publiknya tidak akan berlaku lagi. Pemulihan hanya melalui backup database yang sudah tersedia.</p></div>
          {missingChildren.length > 0 && <p className="neo-notice" role="alert">Pilih juga tahap lanjutan dari turnamen yang akan dihapus: {missingChildren.map(event => event.name).join(", ")}.</p>}
          <label>Ketik HAPUS untuk konfirmasi<input name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" required pattern="HAPUS" /></label>
        </>}
        <input type="hidden" name="selection" value={JSON.stringify(chosen.map(({ id, version }) => ({ id, version })))} />
        <button className="neo-button neo-delete-button" type="submit" disabled={!chosen.length || confirmation !== "HAPUS" || missingChildren.length > 0 || pending}>{pending ? "Menghapus…" : `Hapus ${chosen.length} turnamen permanen`}</button>
      </fieldset>
      {state.error && <p className="neo-notice neo-error" role="alert">{state.error}</p>}
      {state.message && <p className="neo-notice neo-success" role="status">{state.message}</p>}
    </form>
  </details>;
}
