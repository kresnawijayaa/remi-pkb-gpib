import Link from "next/link";
import { Icon } from "@/components/icon";
import { Shell } from "@/components/flexible/shell";
import { auditExample, exampleTotals, pointRules, rankingCriteria, rulesSections, rulesVersion } from "@/lib/flexible/competition-rules";
import "@/app/tournaments/neo.css";

export const metadata = { title: "Aturan pertandingan dan perhitungan · REMI", description: "Acuan peserta dan panitia: poin, klasemen, pembagian meja, seri, dan pemeriksaan hasil pertandingan REMI.", robots: { index: false, follow: false } };

export default function CompetitionRulesPage() {
  return <Shell publicView publicMode="rules">
    <header className="neo-rules-hero"><div><span className="neo-tag neo-blue">ACUAN PANITIA & PESERTA</span><h1>Pahami hasilnya.<br />Periksa hitungannya.</h1><p>Aturan sistem pertandingan REMI: dari skor meja sampai penetapan peserta lolos. Gunakan halaman ini saat briefing dan ketika memeriksa hasil.</p><small>Versi {rulesVersion}</small></div><aside><a className="neo-button neo-dark" href="/aturan/pdf"><Icon name="download" /> Download aturan PDF</a><p>Isi aturan pada PDF sama dengan halaman ini. Dapat disimpan dan dibagikan tanpa akses admin.</p><Link className="neo-text-link" href="/tournaments">Ke halaman panitia <Icon name="right" /></Link></aside></header>
    <div className="neo-rules-flow" aria-label="Alur perhitungan">{["Skor permainan", "Peringkat meja", "Poin turnamen", "Klasemen"].map((label, index) => <span key={label}>{index > 0 && <Icon name="right" />}<strong>{label}</strong></span>)}</div>
    <p className="neo-rules-note"><strong>Dua hal yang wajib dibedakan:</strong> poin dan skor bukan angka yang sama; klasemen sementara dan keputusan kelolosan juga bukan status yang sama.</p>
    <nav className="neo-rules-nav" aria-label="Bagian aturan">{rulesSections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</nav>
    <div className="neo-rules-body">{rulesSections.map((section, index) => <section className="neo-rules-section" id={section.id} key={section.id} aria-labelledby={`title-${section.id}`}>
      <div className="neo-rules-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><div><h2 id={`title-${section.id}`}>{section.title}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}
        {section.id === "poin" && <div className="neo-rules-points" aria-label="Poin tiap peringkat meja">{pointRules.map(row => <div key={row.rank}><span>{row.rank <= 3 && <Icon name="medal" tone={row.rank === 1 ? "gold" : row.rank === 2 ? "silver" : "bronze"} />} {row.medal}</span><strong>{row.points}<small> poin</small></strong></div>)}</div>}
        {section.id === "klasemen" && <ol className="neo-rules-ranking">{rankingCriteria.map((criterion, i) => <li key={criterion}><b>{i + 1}</b><span>{criterion}</span>{i < rankingCriteria.length - 1 && <small>Jika sama, lanjut ke kriteria berikutnya.</small>}</li>)}</ol>}
        {section.bullets.length > 0 && <ul>{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
        {section.id === "kelolosan" && <div className="neo-rules-note"><strong>Seri penuh bukan diputuskan oleh nomor baris.</strong><p>Cara penyelesaiannya diumumkan panitia saat acara. Jangan menganggap selisih urutan tampilan sebagai bukti peserta lain menang dalam perhitungan.</p></div>}
        {section.id === "cek" && <div className="neo-rules-example"><div className="neo-table-scroll"><table><caption>Contoh pemeriksaan hasil satu peserta, lima babak</caption><thead><tr><th>Babak</th><th>Skor</th><th>Peringkat meja</th><th>Poin</th></tr></thead><tbody>{auditExample.map(row => <tr key={row.round}><td>{row.round}</td><td>{row.score}</td><td>{row.rank}</td><td>{row.points}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{exampleTotals.score.toLocaleString("id-ID")}</td><td>5 babak</td><td>{exampleTotals.points}</td></tr></tfoot></table></div><p><strong>Hasil cek:</strong> {exampleTotals.points} poin · total skor {exampleTotals.score.toLocaleString("id-ID")} · {exampleTotals.gold} Gold · {exampleTotals.silver} Silver · {exampleTotals.bronze} Bronze.</p></div>}
      </div></section>)}</div>
    <section className="neo-rules-briefing"><span className="neo-eyebrow">SEBELUM PERTANDINGAN DIMULAI</span><h2>Checklist briefing panitia</h2><ul><li>Umumkan jumlah babak, kapasitas meja, mode shuffle, dan jumlah peserta lolos.</li><li>Jelaskan poin 5–4–3–2–1 serta urutan klasemen: poin, skor, Gold, Silver, Bronze.</li><li>Umumkan cara memecah skor seri di meja, penyelesaian seri penuh, dan batas pengajuan keberatan.</li><li>Bagikan link pembagian, link klasemen, dan halaman aturan ini. Minta peserta memeriksa catatan hasil per babak.</li></ul><a className="neo-button" href="/aturan/pdf"><Icon name="download" /> Simpan aturan sebagai PDF</a></section>
  </Shell>;
}
