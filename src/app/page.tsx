import Link from "next/link";
import { createTournamentAction, logoutAction } from "@/app/actions";
import { getTournaments } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  const tournaments = await getTournaments();

  return (
    <main className="app-container flex min-h-screen flex-col overflow-hidden py-5 md:h-screen md:min-h-0 md:py-6">
      <header className="relative flex shrink-0 flex-col gap-4 overflow-hidden border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm font-semibold uppercase text-muted-foreground">
            <span>Persekutuan Kaum Bapak</span>
            <form action={logoutAction}>
              <SubmitButton variant="ghost" size="sm" pendingText="Keluar...">
                Keluar
              </SubmitButton>
            </form>
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl xl:text-6xl">Panel turnamen Remi 13</h1>
        </div>
        <div className="hidden h-28 w-56 shrink-0 items-end justify-end md:flex" aria-hidden="true">
          <div className="relative h-28 w-44">
            <div className="absolute bottom-0 left-4 h-28 w-20 rotate-[-8deg] border border-border bg-card p-3 shadow-sm">
              <div className="text-sm font-semibold text-red-700">13</div>
              <div className="mt-6 h-3 w-3 rotate-45 bg-red-700" />
              <div className="absolute bottom-3 right-3 text-sm font-semibold text-red-700">13</div>
            </div>
            <div className="absolute bottom-2 left-20 h-28 w-20 rotate-[7deg] border border-border bg-card p-3 shadow-sm">
              <div className="text-sm font-semibold text-foreground">A</div>
              <div className="mt-6 h-3 w-3 rounded-full bg-foreground" />
              <div className="absolute bottom-3 right-3 text-sm font-semibold text-foreground">A</div>
            </div>
            <div className="absolute bottom-7 left-36 h-20 w-14 rotate-[14deg] border border-border bg-secondary p-2">
              <div className="h-2 w-2 rotate-45 bg-accent" />
              <div className="mt-7 h-2 w-2 rotate-45 bg-accent" />
            </div>
          </div>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 gap-6 py-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid min-h-0 gap-4">
          <div>
            <h2 className="text-xl font-semibold">Daftar turnamen</h2>
            <div className="mt-1 text-sm text-muted-foreground">{tournaments.length} turnamen tersimpan</div>
          </div>

          {tournaments.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-background p-8 text-muted-foreground">
              Belum ada turnamen. Buat satu turnamen untuk mulai input peserta.
            </div>
          ) : (
            <div className="grid min-h-0 gap-3 overflow-y-auto pr-2 md:max-h-[calc(100vh-365px)]">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.id}`}
                  className="group grid gap-3 border border-border bg-card p-5 transition hover:border-primary hover:bg-secondary/40 active:translate-y-px md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold group-hover:text-primary">{tournament.name}</h3>
                      <Badge>{tournament.status}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {tournament.eventDate ?? "Tanggal belum diisi"} / {tournament.location ?? "Lokasi belum diisi"}
                    </div>
                  </div>
                  <span className={buttonClass({ variant: "outline" })}>Buka</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-8">
          <details className="group w-full border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold transition hover:bg-secondary/60 active:translate-y-px">
              <span>Buat turnamen</span>
              <span className="text-muted-foreground transition group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={createTournamentAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama turnamen</Label>
                  <Input id="name" name="name" defaultValue="Turnamen Remi PKB HUT 2026" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eventDate">Tanggal</Label>
                  <Input id="eventDate" name="eventDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Lokasi</Label>
                  <Input id="location" name="location" placeholder="Aula Gereja" />
                </div>
                <SubmitButton size="lg" className="w-full" pendingText="Membuat...">Buat</SubmitButton>
              </form>
            </div>
          </details>
        </aside>
      </section>

      <footer className="shrink-0 border-t border-border py-4 text-sm text-muted-foreground">
        <a
          href="https://gpibharapanindah.org"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-foreground underline-offset-4 transition hover:text-accent hover:underline"
        >
          Project GPIB Harapan Indah Bekasi
        </a>
      </footer>
    </main>
  );
}
