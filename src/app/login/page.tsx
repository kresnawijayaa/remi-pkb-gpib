import Image from "next/image";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { isAuthEnabled, isAuthenticated } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import "../tournaments/neo.css";

const churchUrl = "https://gpibharapanindah.org";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isAuthEnabled()) redirect("/");
  if (await isAuthenticated()) redirect("/");

  const query = await searchParams;

  return (
    <div className="neo-app neo-login-page">
      <header className="neo-top neo-login-header"><div className="neo-header-identity"><div className="neo-brand" aria-label="REMI"><span className="neo-mark" aria-hidden="true">♠</span> REMI<span className="neo-edition">TOURNAMENT DESK</span></div><a className="neo-host" href={churchUrl} target="_blank" rel="noopener noreferrer"><Image src="/images/logo-gpib-hi.png" alt="Logo GPIB Harapan Indah" width={46} height={46} priority /><span><small>PERSEKUTUAN KAUM BAPAK</small><strong>GPIB Harapan Indah</strong></span></a></div></header>
      <main className="neo-login-main">
        <section className="neo-login-intro"><span className="neo-eyebrow">AKSES PANITIA</span><h1>Panel turnamen REMI</h1><p>Sistem pengelolaan peserta, pembagian meja, skor, dan klasemen turnamen.</p><div className="neo-login-card-mark" aria-hidden="true"><span>13</span><b>♠</b><span>13</span></div></section>
        <section className="neo-panel neo-login-panel"><span className="neo-tag neo-blue">LOGIN</span><h2>Masuk</h2><p>Masukkan PIN panitia untuk mengakses panel turnamen.</p>
          {(query.error === "pin" || query.error === "rate") && <div className="neo-notice neo-error" role="alert">{query.error === "rate" ? "Terlalu banyak percobaan. Tunggu satu menit sebelum mencoba lagi." : "PIN tidak sesuai."}</div>}
          <form action={loginAction} className="neo-form neo-login-form"><label htmlFor="pin">PIN panitia<input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="current-password" autoFocus required /></label><SubmitButton className="neo-button neo-dark" pendingText="Memeriksa...">Masuk</SubmitButton></form>
        </section>
      </main>
      <footer className="neo-footer"><div><strong>REMI · PERSEKUTUAN KAUM BAPAK</strong><a href={churchUrl} target="_blank" rel="noopener noreferrer">GPIB Harapan Indah ↗</a></div><span>Sistem pengelolaan turnamen</span></footer>
    </div>
  );
}
