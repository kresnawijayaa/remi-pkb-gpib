import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { ViewerLinkModal } from "@/components/tournament/viewer-link-modal";
import type { Tournament } from "@/types/tournament";

type SectionKey = "dashboard" | "participants" | "communities" | "import" | "game" | "standings";

const navItems: { key: SectionKey; label: string; href: (tournamentId: string) => string }[] = [
  { key: "dashboard", label: "Dashboard", href: (tournamentId) => `/tournaments/${tournamentId}` },
  { key: "participants", label: "Peserta", href: (tournamentId) => `/tournaments/${tournamentId}/participants` },
  { key: "communities", label: "Komunitas", href: (tournamentId) => `/tournaments/${tournamentId}/communities` },
  { key: "import", label: "Import CSV", href: (tournamentId) => `/tournaments/${tournamentId}/import` },
  { key: "game", label: "Permainan", href: (tournamentId) => `/tournaments/${tournamentId}/game` },
  { key: "standings", label: "Top klasemen", href: (tournamentId) => `/tournaments/${tournamentId}/standings` },
];

export function TournamentSectionShell({
  tournamentId,
  tournament,
  summary,
  activeSection,
  children,
  showViewerButton = true,
}: {
  tournamentId: string;
  tournament: Tournament;
  summary: {
    participantCount: number;
    communityCount: number;
    roundCount: number;
    tableCount: number;
    submittedTableCount: number;
  };
  activeSection: SectionKey;
  children: ReactNode;
  showViewerButton?: boolean;
}) {
  return (
    <main className="app-container grid min-w-0 gap-5 py-7 overflow-x-hidden">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href="/" className="text-sm font-semibold text-primary">&larr; Semua turnamen</Link>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">{tournament.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {tournament.eventDate ?? "Tanggal belum diisi"} / {tournament.location ?? "Lokasi belum diisi"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {showViewerButton && <ViewerLinkModal viewerPath={`/tournaments/${tournamentId}/viewer`} />}
          <Link className={buttonClass({ variant: "outline" })} href={`/api/export?tournamentId=${tournamentId}`}>
            Export Excel
          </Link>
        </div>
      </header>

      <section className="grid border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Peserta" value={summary.participantCount} />
        <Stat label="Komunitas" value={summary.communityCount} />
        <Stat label="Babak" value={summary.roundCount} />
        <Stat label="Meja submit" value={`${summary.submittedTableCount}/${summary.tableCount}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
        <aside className="border border-border bg-card p-1 lg:sticky lg:top-6">
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href(tournamentId)}
                className={buttonClass({
                  variant: activeSection === item.key ? "default" : "ghost",
                  className: "justify-start px-3 py-2",
                })}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-b border-border p-3 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
