"use client";

import { useEffect, useState } from "react";

export function ShareLink({ token }: { token: string }) {
  const path = `/share/${token}`;
  const [url, setUrl] = useState(path);
  const [message, setMessage] = useState("");
  useEffect(() => { setUrl(new URL(path, window.location.origin).href); }, [path]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link tersalin."); }
    catch { setMessage("Salin manual dari kolom link di atas."); }
  }
  return <div className="neo-link-box"><label>Link untuk peserta<input value={url} readOnly onFocus={event => event.currentTarget.select()} /></label><div className="neo-actions"><button className="neo-button" type="button" onClick={copy}>Salin link</button><a href={path} className="neo-button neo-secondary" target="_blank" rel="noopener noreferrer">Lihat jadwal ↗</a></div><p role="status">{message}</p></div>;
}
