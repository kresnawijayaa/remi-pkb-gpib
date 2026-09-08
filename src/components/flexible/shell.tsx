import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { isAuthEnabled } from "@/lib/auth";

const churchUrl = "https://gpibharapanindah.org";

export function Shell({ children, publicView = false }: { children: React.ReactNode; publicView?: boolean }) {
  return <div className="neo-app"><header className="neo-top"><div className="neo-header-identity"><Link href={publicView ? "#jadwal" : "/tournaments"} className="neo-brand" aria-label="REMI"><span className="neo-mark" aria-hidden="true">♠</span> REMI<span className="neo-edition">{publicView ? "JADWAL PESERTA" : "TOURNAMENT DESK"}</span></Link><a className="neo-host" href={churchUrl} target="_blank" rel="noopener noreferrer" aria-label="Kunjungi situs GPIB Harapan Indah"><Image src="/images/logo-gpib-hi.png" alt="Logo GPIB Harapan Indah" width={46} height={46} priority /><span><small>PERSEKUTUAN KAUM BAPAK</small><strong>GPIB Harapan Indah</strong></span></a></div>
    {!publicView && <nav aria-label="Navigasi utama"><Link href="/tournaments">Turnamen</Link><Link href="/tournaments-old">Arsip lama ↗</Link>{isAuthEnabled() && <form action={logoutAction}><button type="submit">Keluar</button></form>}</nav>}
    {publicView && <span className="neo-tag">TANPA SKOR · BACA SAJA</span>}
  </header><main className="neo-main" id="jadwal">{children}</main><footer className="neo-footer"><div><strong>REMI · PERSEKUTUAN KAUM BAPAK</strong><a href={churchUrl} target="_blank" rel="noopener noreferrer">GPIB Harapan Indah ↗</a></div><span>{publicView ? "Informasi pembagian meja peserta" : "Sistem pengelolaan turnamen"}</span></footer></div>;
}

export function SetupNotice() {
  return <section className="neo-panel"><span className="neo-tag">DATABASE</span><h2>Database belum tersedia</h2><p>Koneksi database belum tersedia atau migrasi REMI fleksibel belum dijalankan. Data turnamen lama tidak perlu dihapus.</p><p><code>npm run db:migrate:flexible</code></p><Link className="neo-button neo-secondary" href="/tournaments">Coba lagi</Link></section>;
}
