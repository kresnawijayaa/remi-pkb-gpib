"use client";

import { useEffect, useState } from "react";

export function ShareLink({ token, kind = "schedule", shortCode }: { token: string; kind?: "schedule" | "standings"; shortCode?: string | null }) {
  const standings = kind === "standings";
  const canonicalPath = standings ? `/klasemen/${token}` : `/share/${token}`;
  const path = shortCode ? `/${standings ? "k" : "m"}/${shortCode}` : canonicalPath;
  const [url, setUrl] = useState(path);
  const [message, setMessage] = useState("");
  useEffect(() => { setUrl(new URL(path, window.location.origin).href); }, [path]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link tersalin."); }
    catch { setMessage("Salin manual dari kolom link di atas."); }
  }
  return <div className="neo-link-box"><label>{shortCode ? "Shortlink publik" : standings ? "Link klasemen publik" : "Link untuk peserta"}<input value={url} readOnly onFocus={event => event.currentTarget.select()} /></label>{shortCode && <p className="neo-hint">Kode {shortCode} dibuat dari tanggal dan waktu pembuatan link dalam WIB. Link token utama tetap aktif di belakangnya.</p>}<div className="neo-actions"><button className="neo-button" type="button" onClick={copy}>Salin link</button><a href={path} className="neo-button neo-secondary" target="_blank" rel="noopener noreferrer">{standings ? "Lihat klasemen ↗" : "Lihat jadwal ↗"}</a></div><p role="status">{message}</p></div>;
}
