"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export type PublicStandingRow = { rank: number; number: number; name: string; community: string; played: number; firsts: number; seconds: number; thirds: number; points: number; totalScore: number };

export function PublicStandings({ name, rounds, completedTables, expectedTables, final, standings, updatedAt }: { name: string; rounds: number; completedTables: number; expectedTables: number; final: boolean; standings: PublicStandingRow[]; updatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [router]);
  return <>
    <header className="neo-public-standing-head"><div><span className={`neo-tag ${final ? "neo-green" : "neo-blue"}`}>{final ? "HASIL AKHIR" : "KLASEMEN SEMENTARA"}</span><h1>{name}</h1><p>Peringkat diperbarui otomatis setiap 30 detik selama pertandingan berlangsung.</p></div><div className="neo-live-summary"><span><small>HASIL MEJA</small><strong>{completedTables}/{expectedTables}</strong></span><span><small>BABAK</small><strong>{rounds}</strong></span></div></header>
    <div className="neo-public-standing-tools"><p><span className="neo-live-dot" aria-hidden="true" /> Terakhir diperbarui {updatedAt}</p><button className="neo-button neo-secondary" type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Memuat…" : "↻ Perbarui sekarang"}</button></div>
    {standings.length ? <div className="neo-table-scroll neo-public-standing-scroll"><table className="neo-public-standing-table"><thead><tr><th>Peringkat</th><th>Peserta</th><th>Main</th><th aria-label="Jumlah peringkat pertama">P1</th><th aria-label="Jumlah peringkat kedua">P2</th><th aria-label="Jumlah peringkat ketiga">P3</th><th>Poin</th><th>Total skor</th></tr></thead><tbody>{standings.map(row => <tr key={row.number} className={row.rank <= 3 ? `is-podium is-rank-${row.rank}` : ""}><td><strong>{String(row.rank).padStart(2, "0")}</strong></td><td><strong>{row.name}</strong><small>#{row.number} · {row.community || "Tanpa komunitas"}</small></td><td>{row.played}/{rounds}</td><td>{row.firsts}</td><td>{row.seconds}</td><td>{row.thirds}</td><td><strong>{row.points}</strong></td><td>{row.totalScore}</td></tr>)}</tbody></table></div> : <section className="neo-empty"><h2>Klasemen belum tersedia.</h2><p>Belum ada hasil meja yang masuk. Halaman akan memperbarui data secara otomatis.</p></section>}
    <p className="neo-footnote">Halaman ini hanya menampilkan klasemen dan tidak memberikan akses ke pengelolaan turnamen.</p>
  </>;
}
