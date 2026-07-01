type RoundResult = {
  score: number;
  tableRank: number;
};

const medalClassByRank: Record<number, string> = {
  1: "border-yellow-500 bg-yellow-100 text-yellow-800",
  2: "border-slate-400 bg-slate-100 text-slate-700",
  3: "border-amber-700 bg-amber-100 text-amber-900",
};

export function MedalHeader({ rank }: { rank: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center justify-center" title={getRankLabel(rank)} aria-label={getRankLabel(rank)}>
      <MedalMark rank={rank} />
    </span>
  );
}

export function RoundScore({ result }: { result?: RoundResult }) {
  if (!result) return <span>-</span>;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>{result.score}</span>
      <span className="text-[11px] leading-none text-muted-foreground">
        ({result.tableRank})
      </span>
    </span>
  );
}

function MedalMark({ rank }: { rank: number }) {
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold leading-none",
        medalClassByRank[rank] ?? "border-border bg-muted text-muted-foreground",
      ].join(" ")}
      title={getRankLabel(rank)}
      aria-label={getRankLabel(rank)}
    >
      {rank}
    </span>
  );
}

function getRankLabel(rank: number) {
  if (rank === 1) return "Medali emas";
  if (rank === 2) return "Medali perak";
  if (rank === 3) return "Medali perunggu";
  return `Peringkat ${rank}`;
}
