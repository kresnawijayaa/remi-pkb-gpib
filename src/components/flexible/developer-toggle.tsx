"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { setDeveloperAccess, type DeveloperActionState } from "@/app/tournaments/developer-actions";

export function DeveloperToggle({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(setDeveloperAccess, {} as DeveloperActionState);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const eventId = pathname.match(/^\/tournaments\/([a-f0-9-]{36})(?:\/|$)/i)?.[1];
  useEffect(() => {
    if (open && !enabled) input.current?.focus();
  }, [open, enabled]);
  return <aside className={`neo-developer-dock ${enabled ? "is-enabled" : ""}`} aria-label="Mode developer" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    {open && <section id="developer-panel" className="neo-developer-panel" aria-labelledby="developer-title"><header><span className="neo-eyebrow">KHUSUS SIMULASI PANITIA</span><button type="button" className="neo-notice-close" aria-label="Tutup panel developer" onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button></header><h2 id="developer-title">{enabled ? "Mode developer aktif" : "Aktifkan developer"}</h2>
      {enabled ? <><p>Fitur peserta uji dan skor simulasi tersedia pada halaman yang sesuai. Mode ini berlaku selama satu jam atau sampai Anda keluar.</p>{eventId && <div className="neo-developer-links"><Link href={`/tournaments/${eventId}#developer-tools`} onClick={() => setOpen(false)}>Peserta uji →</Link><Link href={`/tournaments/${eventId}/game#developer-tools`} onClick={() => setOpen(false)}>Skor simulasi →</Link></div>}<small>Peserta uji memerlukan slot peserta tersisa. Skor simulasi memerlukan pembagian terkunci dan kelolosan yang masih terbuka.</small><form action={action}><input type="hidden" name="operation" value="disable" /><button type="submit" className="neo-button neo-dark" disabled={pending}>{pending ? "Menonaktifkan…" : "Nonaktifkan developer"}</button></form></> : <><p>Masukkan PIN sekali untuk menampilkan fitur developer pada sesi ini.</p>{configured ? <form action={action}><input type="hidden" name="operation" value="enable" /><label htmlFor="developer-pin">PIN developer<input ref={input} id="developer-pin" name="pin" type="password" autoComplete="off" maxLength={128} required disabled={pending} /></label>{state.error && <p className="neo-notice neo-error" role="alert">{state.error}</p>}<button type="submit" className="neo-button neo-dark" disabled={pending}>{pending ? "Memeriksa…" : "Aktifkan developer"}</button></form> : <p className="neo-notice">PIN developer belum disiapkan. Hubungi pengelola aplikasi.</p>}</>}
    </section>}
    <button ref={trigger} type="button" className="neo-developer-trigger" aria-expanded={open} aria-controls="developer-panel" onClick={() => setOpen(value => !value)}><span aria-hidden="true">{enabled ? "●" : "⌘"}</span>{enabled ? "Developer aktif" : "Developer"}</button>
  </aside>;
}
