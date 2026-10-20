
import { Icon } from "@/components/icon";
import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { isAuthEnabled } from "@/lib/auth";

const churchUrl = "https://gpibharapanindah.org";

export function Shell({ children, publicView = false, publicMode = "schedule" }: { children: React.ReactNode; publicView?: boolean; publicMode?: "schedule" | "standings" | "rules" }) {
  const publicStandings = publicView && publicMode === "standings";
  const publicRules = publicView && publicMode === "rules";
  const anchor = publicRules ? "aturan" : publicStandings ? "klasemen" : "jadwal";
  return <div className="neo-app"><header className="neo-top"><div className="neo-header-identity"><Link href={publicView ? `#${anchor}` : "/tournaments"} className="neo-brand" aria-label="REMI"><span className="neo-mark" aria-hidden="true"><Icon name="spade" /></span> REMI<span className="neo-edition">{publicView ? publicRules ? "ATURAN PERTANDINGAN" : publicStandings ? "KLASEMEN LIVE" : "JADWAL PESERTA" : "TOURNAMENT DESK"}</span></Link><a className="neo-host" href={churchUrl} target="_blank" rel="noopener noreferrer" aria-label="Kunjungi situs GPIB Harapan Indah"><Image src="/images/logo-gpib-hi.png" alt="Logo GPIB Harapan Indah" width={46} height={46} priority /><span><small>PERSEKUTUAN KAUM BAPAK</small><strong>GPIB Harapan Indah</strong></span></a></div>
    {!publicView && <nav aria-label="Navigasi utama"><Link href="/tournaments">Turnamen</Link><Link href="/tournaments-old">Arsip lama <Icon name="external" /></Link>{isAuthEnabled() && <form action={logoutAction}><button type="submit">Keluar</button></form>}</nav>}
    {publicView && <span className="neo-tag">{publicRules ? "ACUAN PESERTA · BACA SAJA" : publicStandings ? "KLASEMEN · BACA SAJA" : "TANPA SKOR · BACA SAJA"}</span>}
  </header><main className="neo-main" id={anchor}>{children}</main><footer className="neo-footer"><div><strong>REMI · PERSEKUTUAN KAUM BAPAK</strong><a href={churchUrl} target="_blank" rel="noopener noreferrer">GPIB Harapan Indah <Icon name="external" /></a><Link href="/aturan">Aturan pertandingan</Link></div><span>{publicView ? publicRules ? "Aturan sistem pertandingan" : publicStandings ? "Klasemen turnamen" : "Informasi pembagian meja peserta" : "Sistem pengelolaan turnamen"}</span></footer></div>;
}

export function SetupNotice() {
  return <section className="neo-panel"><span className="neo-tag">DATABASE</span><h2>Database belum tersedia</h2><p>Koneksi database belum tersedia atau migrasi REMI fleksibel belum dijalankan. Data turnamen lama tidak perlu dihapus.</p><p><code>npm run db:migrate:flexible</code></p><Link className="neo-button neo-secondary" href="/tournaments">Coba lagi</Link></section>;
}
