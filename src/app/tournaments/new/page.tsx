import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ActionForm, SendButton } from "@/components/flexible/form";
import { SettingsFields } from "@/components/flexible/settings";

export default function NewTournamentPage() {
  return <><Link className="neo-back" href="/tournaments">← Semua turnamen</Link><header className="neo-page-heading"><span className="neo-eyebrow">TURNAMEN BARU</span><h1>Buat turnamen</h1><p>Tentukan jumlah peserta, kapasitas meja, jumlah babak, dan jumlah peserta yang lolos.</p></header><div className="neo-two-col"><section className="neo-panel"><div className="neo-section-heading"><h2>Konfigurasi pertandingan</h2><span className="neo-tag neo-blue">01 / SETUP</span></div><ActionForm eventId={randomUUID()} operation="create"><SettingsFields /><SendButton>Buat & lanjut isi peserta →</SendButton></ActionForm></section><aside className="neo-side-note"><span className="neo-eyebrow">ALUR PERSIAPAN</span><h2>Proses persiapan</h2><ol><li>Tentukan format pertandingan.</li><li>Daftarkan nama peserta.</li><li>Generate, periksa, lalu kunci setiap babak.</li><li>Bagikan link pembagian meja kepada peserta.</li></ol><p>Jumlah peserta yang lolos digunakan ketika membuat tahap turnamen berikutnya.</p></aside></div></>;
}
