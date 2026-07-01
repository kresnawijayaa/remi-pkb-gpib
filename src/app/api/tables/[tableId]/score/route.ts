import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { calculateTableRanking } from "@/lib/tournament/scoring";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const start = Date.now();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableId } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        tournamentId?: string;
        roundId?: string;
        scores?: { tablePlayerId?: string; participantId?: string; score?: number }[];
      }
    | null;

  if (!body?.tournamentId || !body.roundId || !Array.isArray(body.scores)) {
    return NextResponse.json({ error: "Data skor tidak lengkap." }, { status: 400 });
  }

  const [round] = await sql`
    select r.id, r.round_type, r.status
    from rounds r
    join match_tables mt on mt.round_id = r.id
    where r.id = ${body.roundId}
      and r.tournament_id = ${body.tournamentId}
      and mt.id = ${tableId}
  `;

  if (!round) return NextResponse.json({ error: "Babak atau meja tidak ditemukan." }, { status: 404 });
  if (round.status !== "active") {
    return NextResponse.json({ error: "Input skor hanya bisa dilakukan saat babak aktif." }, { status: 400 });
  }

  const scores = body.scores.map((item) => ({
    tablePlayerId: String(item.tablePlayerId ?? ""),
    participantId: String(item.participantId ?? ""),
    score: Number(item.score),
    manualRank: null,
  }));

  if (scores.some((item) => !item.tablePlayerId || !item.participantId || Number.isNaN(item.score))) {
    return NextResponse.json({ error: "Semua skor harus berupa angka." }, { status: 400 });
  }

  const ranking = calculateTableRanking(scores);
  const rankMap = new Map(ranking.rankings.map((row) => [row.participantId, row]));

  await Promise.all(scores.map((item) => {
    const rank = rankMap.get(item.participantId);
    return sql`
      update table_players
      set score = ${item.score},
          manual_rank = null,
          table_rank = ${rank?.tableRank ?? null},
          tournament_point = ${rank?.tournamentPoint ?? null},
          updated_at = now()
      where id = ${item.tablePlayerId}
        and table_id = ${tableId}
        and round_id = ${body.roundId}
        and tournament_id = ${body.tournamentId}
    `;
  }));

  await sql`
    update match_tables
    set status = 'submitted', submitted_at = now(), updated_at = now()
    where id = ${tableId}
  `;

  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production" || duration > 500) {
    console.log(`[PERF] api submit score ${tableId}: ${duration}ms`);
  }

  return NextResponse.json({ ok: true });
}
