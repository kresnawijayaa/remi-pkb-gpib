"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ViewerTable = {
  id: string;
  tableNumber: number;
  tableName: string;
  players: {
    id: string;
    seatNumber: number;
    participantName: string;
    communityName: string | null;
    score: number | null;
    tableRank: number | null;
  }[];
};

type ViewerStanding = {
  participantId: string;
  rank: number;
  name: string;
  communityName: string | null;
  totalPoint: number;
  totalScore: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
};

type ViewerFinalResult = {
  participantId: string;
  position: number;
  name: string;
  communityName: string | null;
  tableName: string;
  tableRank: number;
  score: number;
  qualificationRank: number;
  qualificationPoint: number;
};

export function ViewerBoard({
  tournamentId,
  tournamentName,
  roundType,
  roundLabel,
  statusLabel,
  tables,
  standings,
  finalResults,
}: {
  tournamentId: string;
  tournamentName: string;
  roundType: "qualification" | "semifinal" | "final";
  roundLabel: string;
  statusLabel: string;
  tables: ViewerTable[];
  standings: ViewerStanding[];
  finalResults: ViewerFinalResult[];
}) {
  const isFinal = roundType === "final";
  const tablePages = useMemo(() => chunkTables(tables, isFinal ? 2 : 2), [tables, isFinal]);
  const [page, setPage] = useState(0);
  const [autoPlay, setAutoPlay] = useState(!isFinal);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const safePage = tablePages.length === 0 ? 0 : Math.min(page, tablePages.length - 1);
  const visibleTables = tablePages[safePage] ?? [];

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!autoPlay || tablePages.length <= 1) return;
    const interval = window.setInterval(() => {
      setPage((current) => (current + 1) % tablePages.length);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [autoPlay, tablePages.length]);

  function goNext() {
    if (tablePages.length <= 1) return;
    setPage((current) => (current + 1) % tablePages.length);
  }

  function goPrev() {
    if (tablePages.length <= 1) return;
    setPage((current) => (current - 1 + tablePages.length) % tablePages.length);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  return (
    <section
      className={cn(
        "app-container grid h-[calc(100vh-32px)] min-h-0 gap-5 overflow-hidden",
        isFinal ? "xl:grid-cols-2" : "xl:grid-cols-[7fr_5fr]"
      )}
    >
      <div className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-3 overflow-hidden">
        <div className="border-b border-background/20 pb-3">
          <div>
            <Link href={`/tournaments/${tournamentId}`} className="text-sm font-semibold text-background/70">&larr; Dashboard</Link>
            <h1 className="mt-2 truncate text-4xl font-semibold lg:text-5xl">{tournamentName}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-2xl font-semibold leading-none">{roundLabel}</div>
            <div className="text-xs font-semibold uppercase text-amber-100">{statusLabel}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tablePages.length > 1 && (
              <>
                <button type="button" onClick={goPrev} className="border border-background/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-background/10 active:translate-y-px">
                  Sebelumnya
                </button>
                <button type="button" onClick={goNext} className="border border-background/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-background/10 active:translate-y-px">
                  Berikutnya
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPlay((value) => !value)}
                  className={cn(
                    "border px-3 py-1.5 text-sm font-semibold transition active:translate-y-px",
                    autoPlay
                      ? "border-amber-200 bg-amber-100 text-foreground hover:bg-amber-50"
                      : "border-background/20 hover:bg-background/10"
                  )}
                >
                  Auto {autoPlay ? "on" : "off"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="border border-background/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-background/10 active:translate-y-px"
            >
              {isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
            </button>
          </div>
        </div>

        <div className={cn("grid min-h-0 gap-4 overflow-hidden", isFinal ? "md:grid-cols-2" : "md:grid-cols-2")}>
          {visibleTables.map((table) => (
            <TableCard key={`${table.id}-${safePage}`} table={table} isFinal={isFinal} />
          ))}
          {visibleTables.length === 0 && (
            <div className="border border-background/20 p-8 text-background/70">
              Belum ada data meja untuk ditampilkan.
            </div>
          )}
        </div>

        <div className="flex min-h-0 items-end justify-start">
          <div>
            <div className="border border-background/20 bg-background/[0.03] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase text-background/55">Sedang tampil</div>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <div className="text-lg font-semibold leading-none">{roundLabel}</div>
                <div className="text-[11px] font-semibold uppercase text-amber-100">{statusLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFinal ? (
        <FinalLeaderboard rows={finalResults} />
      ) : (
        <QualificationLeaderboard rows={standings} />
      )}

    </section>
  );
}

function TableCard({ table, isFinal }: { table: ViewerTable; isFinal: boolean }) {
  return (
    <article className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border border-background/20 bg-background/[0.03] p-4">
      <div className="flex items-end justify-between gap-4 border-b border-background/15 pb-2.5">
        <h2 className="text-2xl font-semibold xl:text-3xl">{table.tableName}</h2>
        <div className="text-right text-sm uppercase text-background/55">Meja {table.tableNumber}</div>
      </div>
      <div className="mt-3 grid min-h-0 content-start gap-1.5 overflow-hidden">
        {table.players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "grid min-h-0 items-center gap-3 border-b border-background/10 py-2",
              isFinal ? "grid-cols-[32px_1fr_auto]" : "grid-cols-[32px_1fr_auto]"
            )}
          >
            <div className="text-xl font-semibold text-background/70">{player.seatNumber}</div>
            <div className="min-w-0">
              <div className="truncate text-2xl font-semibold leading-tight">{player.participantName}</div>
              <div className="mt-0.5 truncate text-base text-background/60">{player.communityName ?? "-"}</div>
            </div>
            <div className="min-w-[74px] text-right">
              {player.tableRank && <div className="text-lg font-semibold">R{player.tableRank}</div>}
              {player.score !== null && <div className="text-base text-background/60">{player.score}</div>}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function QualificationLeaderboard({ rows }: { rows: ViewerStanding[] }) {
  const columns = splitRows(rows, 2);

  return (
    <aside className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border border-background/20 bg-background/[0.03] p-3">
      <div className="flex items-end justify-between gap-3 border-b border-background/15 pb-2">
        <div>
          <div className="text-xs font-semibold uppercase text-background/60">Leaderboard</div>
          <h2 className="mt-0.5 text-2xl font-semibold leading-none">Penyisihan</h2>
        </div>
        <div className="text-xl font-semibold">{rows.length}</div>
      </div>
      <div className="mt-2 grid min-h-0 grid-cols-2 gap-0 overflow-hidden">
        {columns.map((column, index) => (
          <div
            key={index}
            className={cn(
              "min-w-0",
              index > 0 && "ml-3 border-l border-background/25 pl-3"
            )}
          >
            <table className="w-full table-fixed text-left text-[10px] leading-tight">
              <thead className="text-background/60">
                <tr>
                  <th className="w-6 py-1">#</th>
                  <th>Peserta</th>
                  <th className="w-7 text-right">P</th>
                  <th className="w-10 text-right">Skor</th>
                </tr>
              </thead>
              <tbody>
                {column.map((row) => (
                  <tr key={row.participantId} className="border-t border-background/10">
                    <td className="py-[6px] pr-1 font-semibold">{row.rank}</td>
                    <td className="min-w-0 py-[6px] pr-1">
                      <div className="truncate font-semibold" title={`${row.name} / ${row.communityName ?? "-"}`}>
                        {row.name}
                      </div>
                    </td>
                    <td className="py-[6px] text-right font-semibold">{row.totalPoint}</td>
                    <td className="py-[6px] text-right text-background/70">{row.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="col-span-2 border border-background/15 p-5 text-background/60">
            Klasemen muncul setelah babak dikunci.
          </div>
        )}
      </div>
    </aside>
  );
}

function FinalLeaderboard({ rows }: { rows: ViewerFinalResult[] }) {
  return (
    <aside className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border border-amber-200/50 bg-amber-50/[0.08] p-5">
      <div className="flex items-end justify-between gap-3 border-b border-background/15 pb-3">
        <div>
          <div className="text-xs font-semibold uppercase text-amber-100/80">Klasemen final</div>
          <h2 className="mt-1 text-4xl font-semibold">Juara</h2>
        </div>
        <div className="text-2xl font-semibold">{rows.length}</div>
      </div>
      <div className="mt-4 grid min-h-0 content-start gap-2 overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.participantId}
            className={cn(
              "grid grid-cols-[48px_1fr_auto] items-center gap-3 border border-background/15 p-3",
              row.position <= 3 && "border-amber-200/60 bg-amber-100/10"
            )}
          >
            <div className="text-2xl font-semibold">{row.position}</div>
            <div className="min-w-0">
              <div className="truncate text-xl font-semibold">{row.name}</div>
              <div className="mt-0.5 truncate text-xs text-background/60">
                {row.communityName ?? "-"} / {row.tableName} / Rank penyisihan {row.qualificationRank}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">R{row.tableRank}</div>
              <div className="text-base text-background/70">{row.score}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="border border-background/15 p-6 text-background/60">
            Klasemen final muncul setelah skor final diinput.
          </div>
        )}
      </div>
    </aside>
  );
}

function chunkTables(tables: ViewerTable[], size: number) {
  const chunks: ViewerTable[][] = [];
  for (let index = 0; index < tables.length; index += size) {
    chunks.push(tables.slice(index, index + size));
  }
  return chunks;
}

function splitRows<T>(rows: T[], columns: number) {
  const size = Math.ceil(rows.length / columns);
  return Array.from({ length: columns }, (_, index) => rows.slice(index * size, index * size + size));
}
