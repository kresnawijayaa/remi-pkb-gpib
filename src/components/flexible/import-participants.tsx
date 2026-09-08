"use client";

import { useRef, useState } from "react";

type Preview = { rows: { row: number; name: string; community: string }[]; total: number; accepted: number; duplicates: number; newCommunities: number };

export function ImportParticipants({ eventId, version }: { eventId: string; version: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<{ error?: string; message?: string }>({});
  const [busy, setBusy] = useState(false);
  async function submit(mode: "preview" | "import") {
    const file = input.current?.files?.[0];
    if (!file) return setNotice({ error: "Pilih file terlebih dahulu." });
    setBusy(true); setNotice({});
    const form = new FormData(); form.set("file", file); form.set("version", String(version)); form.set("mode", mode);
    try {
      const response = await fetch(`/api/tournaments/${eventId}/import`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) setNotice({ error: result.error });
      else if (mode === "preview") setPreview(result);
      else { setNotice({ message: result.message }); setPreview(null); if (input.current) input.current.value = ""; window.location.reload(); }
    } catch { setNotice({ error: "Koneksi terputus saat memproses file." }); }
    finally { setBusy(false); }
  }
  return <details className="neo-disclosure"><summary>+ Impor peserta dari file</summary>
    <p>Gunakan Excel, CSV, atau TSV dengan kolom <strong>Nama</strong> dan <strong>Komunitas / Sektor</strong>. Komunitas baru akan didaftarkan otomatis.</p>
    <a className="neo-text-link" href="/templates/remi-peserta-template.xlsx" download>Unduh template Excel →</a>
    <label>Pilih file<input ref={input} type="file" accept=".xlsx,.csv,.tsv" onChange={() => { setPreview(null); setNotice({}); }} /></label>
    {notice.error && <p className="neo-notice neo-error" role="alert">{notice.error}</p>}{notice.message && <p className="neo-notice neo-success">{notice.message}</p>}
    {!preview && <button className="neo-button neo-secondary" type="button" disabled={busy} onClick={() => submit("preview")}>{busy ? "Memeriksa…" : "Periksa file"}</button>}
    {preview && <div className="neo-import-preview"><p className="neo-notice"><strong>{preview.accepted} peserta siap diimpor</strong><br />{preview.newCommunities} komunitas baru · {preview.duplicates} duplikat dilewati</p><div className="neo-table-scroll"><table><thead><tr><th>Baris</th><th>Nama</th><th>Komunitas / Sektor</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.name}</td><td>{row.community}</td></tr>)}</tbody></table></div>{preview.accepted > preview.rows.length && <p className="neo-hint">Menampilkan {preview.rows.length} dari {preview.accepted} baris yang siap.</p>}<div className="neo-actions"><button className="neo-button" type="button" disabled={busy || preview.accepted === 0} onClick={() => submit("import")}>{busy ? "Mengimpor…" : `Impor ${preview.accepted} peserta`}</button><button className="neo-button neo-secondary" type="button" disabled={busy} onClick={() => setPreview(null)}>Ganti file</button></div></div>}
  </details>;
}
