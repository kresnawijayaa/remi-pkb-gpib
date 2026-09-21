"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PublicRoundResult = { round: number; table: number; score: number; tableRank: number; points: number };
export type PublicStandingRow = { rank: number; number: number; name: string; community: string; played: number; firsts: number; seconds: number; thirds: number; points: number; totalScore: number; history: PublicRoundResult[] };

function medalName(rank: number) {
  if (rank === 1) return "Gold";
  if (rank === 2) return "Silver";
  if (rank === 3) return "Bronze";
  return `Posisi ${rank}`;
}

export function PublicStandings({ name, rounds, completedTables, expectedTables, final, standings, updatedAt }: { name: string; rounds: number; completedTables: number; expectedTables: number; final: boolean; standings: PublicStandingRow[]; updatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [router]);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const visibleStandings = normalizedQuery ? standings.filter(row => `${row.name} ${row.number} ${row.community}`.toLocaleLowerCase("id-ID").includes(normalizedQuery)) : standings;

  return <>
    <header className="neo-public-standing-head"><div><span className={`neo-tag ${final ? "neo-green" : "neo-blue"}`}>{final ? "HASIL AKHIR" : "KLASEMEN SEMENTARA"}</span><h1>{name}</h1><p>Peringkat diperbarui otomatis setiap 30 detik selama pertandingan berlangsung.</p></div><div className="neo-live-summary"><span><small>HASIL MEJA</small><strong>{completedTables}/{expectedTables}</strong></span><span><small>BABAK</small><strong>{rounds}</strong></span></div></header>
    <div className="neo-public-standing-tools"><p><span className="neo-live-dot" aria-hidden="true" /> Terakhir diperbarui {updatedAt}</p><button className="neo-button neo-secondary" type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Memuat…" : "↻ Perbarui sekarang"}</button></div>
    {standings.length ? <>
      <div className="neo-public-standing-search"><label htmlFor="standing-search">Cari peserta<input id="standing-search" type="search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nama, nomor, atau komunitas…" /></label><span aria-live="polite">{normalizedQuery ? `${visibleStandings.length} peserta ditemukan` : `${standings.length} peserta dalam klasemen`}</span></div>
      {visibleStandings.length ? <>
        <p className="neo-standing-rule"><strong>Urutan klasemen:</strong> poin terbesar → total skor terbesar → jumlah Gold → Silver → Bronze.</p>
        <div className="neo-table-scroll neo-public-standing-scroll"><table className="neo-public-standing-table"><thead><tr><th>Peringkat</th><th>Peserta</th><th>Main</th><th aria-label="Jumlah medali Gold">🥇 Gold</th><th aria-label="Jumlah medali Silver">🥈 Silver</th><th aria-label="Jumlah medali Bronze">🥉 Bronze</th><th>Poin</th><th>Total skor</th></tr></thead><tbody>{visibleStandings.map(row => <tr key={row.number} className={row.rank <= 3 ? `is-podium is-rank-${row.rank}` : ""}><td><strong>{String(row.rank).padStart(2, "0")}</strong></td><td><strong>{row.name}</strong><small>#{row.number} · {row.community || "Tanpa komunitas"}</small></td><td>{row.played}/{rounds}</td><td>{row.firsts}</td><td>{row.seconds}</td><td>{row.thirds}</td><td><strong>{row.points}</strong></td><td>{row.totalScore}</td></tr>)}</tbody></table></div>
        <section className="neo-standing-history" aria-labelledby="history-title"><div className="neo-standing-history-head"><div><span className="neo-tag neo-blue">TRANSPARANSI HASIL</span><h2 id="history-title">Riwayat poin per babak</h2><p>Buka nama peserta untuk memeriksa meja, skor, posisi, dan poin yang tercatat pada setiap babak.</p></div><strong>{visibleStandings.length} peserta</strong></div><div className="neo-standing-history-list">{visibleStandings.map(row => <details key={row.number}><summary><span className="neo-history-rank">#{String(row.rank).padStart(2, "0")}</span><span><strong>{row.name}</strong><small>Peserta #{row.number} · {row.community || "Tanpa komunitas"}</small></span><span><strong>{row.points} poin</strong><small>Total skor {row.totalScore}</small></span></summary><div className="neo-round-history">{Array.from({ length: rounds }, (_, index) => index + 1).map(round => {
          const result = row.history.find(item => item.round === round);
          return <article key={round} className={result ? "is-complete" : "is-empty"}><span>Babak {String(round).padStart(2, "0")}</span>{result ? <><strong>{medalName(result.tableRank)} · {result.points} poin</strong><small>Meja {String(result.table).padStart(2, "0")} · Skor {result.score}</small></> : <><strong>Belum ada hasil</strong><small>Skor belum tercatat</small></>}</article>;
        })}</div></details>)}</div></section>
      </> : <section className="neo-empty-small" aria-live="polite"><strong>Peserta tidak ditemukan.</strong><p>Coba nama, nomor peserta, atau komunitas yang berbeda.</p></section>}
    </> : <section className="neo-empty"><h2>Klasemen belum tersedia.</h2><p>Belum ada hasil meja yang masuk. Halaman akan memperbarui data secara otomatis.</p></section>}
    <p className="neo-footnote">Geser tabel untuk melihat statistik lainnya. Kolom peringkat dan peserta akan tetap terlihat.</p>
  </>;
}
