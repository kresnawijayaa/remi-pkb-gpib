import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/");

  const query = await searchParams;

  return (
    <main className="app-container grid min-h-screen py-8 lg:grid-cols-[1fr_360px] lg:items-center lg:gap-16">
      <section className="hidden border-r border-border pr-12 lg:block">
        <div className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Persekutuan Kaum Bapak</div>
        <h1 className="max-w-2xl text-5xl font-semibold leading-tight">Panel turnamen Remi 13</h1>
        <div className="mt-12 flex h-40 items-end" aria-hidden="true">
          <div className="relative h-32 w-48">
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
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-sm content-center">
        <div className="border border-border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Masuk</h2>
            <p className="mt-1 text-sm text-muted-foreground">Masukkan PIN panitia untuk membuka panel.</p>
          </div>

          {query.error === "pin" && (
            <div className="mb-4 border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              PIN tidak sesuai.
            </div>
          )}

          <form action={loginAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
            <SubmitButton size="lg" className="w-full" pendingText="Memeriksa...">
              Masuk
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
