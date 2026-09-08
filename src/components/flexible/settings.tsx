"use client";

import { useState } from "react";
import type { Settings } from "@/lib/flexible/model";

export function SettingsFields({ initial }: { initial?: Settings }) {
  const [target, setTarget] = useState(initial?.target ?? 200);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 5);
  const [rounds, setRounds] = useState(initial?.rounds ?? 5);
  const [advancing, setAdvancing] = useState(initial?.advancing ?? 20);
  return <><label>Nama turnamen / tahap<input name="name" required minLength={3} maxLength={100} defaultValue={initial?.name} placeholder="Contoh: REMI PKB · Penyisihan" /></label>
    <div className="neo-fields">
      <label>Target peserta<input name="target" type="number" min={2} max={500} required value={target} onChange={event => setTarget(Number(event.target.value))} /><small>Jumlah nama yang akan didaftarkan</small></label>
      <label>Maksimal per meja<input name="capacity" type="number" min={2} max={10} required value={capacity} onChange={event => setCapacity(Number(event.target.value))} /><small>Meja dibagi semerata mungkin</small></label>
      <label>Jumlah babak<input name="rounds" type="number" min={1} max={20} required value={rounds} onChange={event => setRounds(Number(event.target.value))} /><small>Bisa disiapkan sebelum pertandingan</small></label>
      <label>Peserta lolos<input name="advancing" type="number" min={1} max={Math.max(1, target)} required value={advancing} onChange={event => setAdvancing(Number(event.target.value))} /><small>Target untuk tahap berikutnya</small></label>
    </div>
    <div className="neo-summary" aria-live="polite"><strong>{target || "—"} peserta</strong><span>→</span><strong>{capacity > 0 ? Math.ceil(target / capacity) : "—"} meja / babak</strong><span>→</span><strong>{rounds || "—"} babak</strong><span>→</span><strong>{advancing || "—"} lolos</strong></div>
    {capacity > 0 && target % capacity !== 0 && <p className="neo-notice">Ada meja tidak penuh. Pembagian diseimbangkan; aturan poin untuk ukuran meja berbeda perlu disepakati sebelum pertandingan.</p>}
  </>;
}
