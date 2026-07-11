"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { authCookieName, authCookieValue, requireAuth } from "@/lib/auth";
import { getParticipants, getPreviousTables, getScoredQualificationPlayers, getTournament } from "@/lib/data";
import { formatCommunityDisplayName, normalizeCommunityName } from "@/lib/tournament/normalization";
import { calculateTableRanking } from "@/lib/tournament/scoring";
import { calculateStandings } from "@/lib/tournament/standings";
import { generateExhibitionFinalTables, generateExhibitionSemifinalTables, generateFinalTables } from "@/lib/tournament/final";
import {
  buildMeetingMap,
  calculateRotationPenalty,
  getRotationQuality,
  generateRotation,
  shuffleArray,
  splitIntoTables,
  type GeneratedTable,
  type RotationParticipant,
  type PreviousTable,
} from "@/lib/tournament/rotation";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function assertDeveloperSimulationPin(formData: FormData) {
  if (value(formData, "devPin") !== requiredEnv("REMI_DEV_PIN")) {
    throw new Error("PIN developer tidak sesuai.");
  }
}

function requiredEnv(name: string) {
  const envValue = process.env[name]?.trim();
  if (!envValue) {
    throw new Error(`${name} belum diatur.`);
  }

  return envValue;
}

function logPerf(label: string, start: number) {
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production" || duration > 500) {
    console.log(`[PERF] ${label}: ${duration}ms`);
  }
}

async function usesOptimizedRotation() {
  const cookieStore = await cookies();
  return cookieStore.get("remi_rotation_algorithm")?.value !== "random";
}

function generateRandomRotation({
  participants,
  previousTables,
  tableCount,
  playersPerTable,
  currentRoundNumber,
}: {
  participants: RotationParticipant[];
  previousTables: PreviousTable[];
  tableCount: number;
  playersPerTable: number;
  currentRoundNumber: number;
}) {
  const seededParticipants = shuffleArray(participants).map((participant, index) => ({
    ...participant,
    seedOrder: index + 1,
  }));
  const tables = splitIntoTables(seededParticipants, tableCount);
  const result = calculateRotationPenalty({
    tables,
    meetingMap: buildMeetingMap(previousTables),
    currentRoundNumber,
    playersPerTable,
  });

  return {
    tables,
    seededParticipants,
    totalPenalty: result.penalty,
    warnings: result.warnings,
    quality: getRotationQuality(result.penalty),
  };
}

async function buildRoundRotation({
  participants,
  previousTables,
  tableCount,
  playersPerTable,
  currentRoundNumber,
  variationSwapCount,
  maxIterations,
}: {
  participants: RotationParticipant[];
  previousTables: PreviousTable[];
  tableCount: number;
  playersPerTable: number;
  currentRoundNumber: number;
  variationSwapCount?: number;
  maxIterations?: number;
}) {
  if (!(await usesOptimizedRotation())) {
    return generateRandomRotation({
      participants,
      previousTables,
      tableCount,
      playersPerTable,
      currentRoundNumber,
    });
  }

  return generateRotation({
    participants,
    previousTables,
    tableCount,
    playersPerTable,
    currentRoundNumber,
    variationSwapCount,
    maxIterations,
  });
}

function buildValuesClause(rows: unknown[][], startIndex = 1) {
  const params: unknown[] = [];
  const values = rows
    .map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${startIndex + params.length - 1}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");

  return { values, params };
}

export async function loginAction(formData: FormData) {
  const pin = value(formData, "pin");

  if (pin !== requiredEnv("REMI_ADMIN_PIN")) {
    redirect("/login?error=pin");
  }

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, authCookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}

const simulationCommunities = [
  "Sektor 1",
  "Sektor 2",
  "Sektor 3",
  "Sektor 4",
  "Sektor 5",
  "Sektor 6",
  "Sektor 7",
  "Sektor 8",
  "PKB Gabungan",
  "Tamu",
];

const simulationNames = [
  "Pak Andri",
  "Pak Edo",
  "Pak Jone",
  "Pak Yeshy",
  "Pak Rasendira",
  "Pak Budi",
  "Pak Agus",
  "Pak Daniel",
  "Pak Hendra",
  "Pak Johan",
  "Pak Markus",
  "Pak Samuel",
  "Pak Niko",
  "Pak Ferry",
  "Pak Mario",
  "Pak Chris",
  "Pak Rio",
  "Pak Anton",
  "Pak Benny",
  "Pak Paulus",
  "Pak Simon",
  "Pak Reza",
  "Pak Mikael",
  "Pak Yohan",
  "Pak Darius",
  "Pak Lukas",
  "Pak Martin",
  "Pak Nico",
  "Pak Steven",
  "Pak Nathan",
  "Pak Ivan",
  "Pak David",
  "Pak Kevin",
  "Pak Leo",
  "Pak Arman",
  "Pak Yusuf",
  "Pak Ezra",
  "Pak Theo",
  "Pak Imanuel",
  "Pak Albert",
  "Pak Gilbert",
  "Pak Edwin",
  "Pak Frans",
  "Pak Oscar",
  "Pak Victor",
  "Pak Adrian",
  "Pak Ronald",
  "Pak Herman",
  "Pak Calvin",
  "Pak Jacob",
];

async function upsertSimulationCommunities(tournamentId: string) {
  const communityIds = new Map<string, string>();

  const communityValues = buildValuesClause(
    simulationCommunities.map((rawName) => {
      const name = formatCommunityDisplayName(rawName);
      return [tournamentId, name, normalizeCommunityName(name)];
    })
  );

  const communities = await sql.query(
    `
      insert into communities (tournament_id, name, normalized_name)
      values ${communityValues.values}
      on conflict (tournament_id, normalized_name)
      do update set name = excluded.name, updated_at = now()
      returning id, name
    `,
    communityValues.params
  );

  for (const community of communities) {
    communityIds.set(String(community.name), String(community.id));
  }

  return communityIds;
}

async function getPreviousTablesForRound(tournamentId: string, currentRoundNumber: number): Promise<PreviousTable[]> {
  const rows = await sql`
    select
      r.round_number,
      mt.table_number,
      p.id,
      p.name,
      p.community_id
    from table_players tp
    join rounds r on r.id = tp.round_id
    join match_tables mt on mt.id = tp.table_id
    join participants p on p.id = tp.participant_id
    where tp.tournament_id = ${tournamentId}
      and r.round_type = 'qualification'
      and r.round_number < ${currentRoundNumber}
    order by r.round_number asc, mt.table_number asc
  `;

  const grouped = new Map<string, PreviousTable>();
  for (const row of rows) {
    const key = `${row.round_number}-${row.table_number}`;
    const existing =
      grouped.get(key) ??
      ({
        roundNumber: Number(row.round_number),
        tableNumber: Number(row.table_number),
        players: [],
      } satisfies PreviousTable);

    existing.players.push({
      id: String(row.id),
      name: String(row.name),
      communityId: row.community_id ? String(row.community_id) : null,
    });
    grouped.set(key, existing);
  }

  return [...grouped.values()];
}

async function getRoundArrangement(roundId: string): Promise<GeneratedTable[]> {
  const rows = await sql`
    select
      mt.table_number,
      p.id,
      p.name,
      p.community_id
    from table_players tp
    join match_tables mt on mt.id = tp.table_id
    join participants p on p.id = tp.participant_id
    where tp.round_id = ${roundId}
    order by mt.table_number asc, tp.seat_number asc
  `;

  const grouped = new Map<number, GeneratedTable>();
  for (const row of rows) {
    const tableNumber = Number(row.table_number);
    const existing = grouped.get(tableNumber) ?? { tableNumber, players: [] };
    existing.players.push({
      id: String(row.id),
      name: String(row.name),
      communityId: row.community_id ? String(row.community_id) : null,
    });
    grouped.set(tableNumber, existing);
  }

  return [...grouped.values()].sort((a, b) => a.tableNumber - b.tableNumber);
}

async function getScoredRoundPlayers(roundId: string) {
  const rows = await sql`
    select
      tp.id,
      tp.tournament_id,
      tp.round_id,
      tp.table_id,
      tp.participant_id,
      tp.seat_number,
      tp.score,
      tp.table_rank,
      tp.tournament_point,
      tp.manual_rank,
      mt.table_number,
      mt.table_name,
      r.round_number,
      p.name as participant_name,
      p.participant_number,
      c.name as community_name
    from table_players tp
    join rounds r on r.id = tp.round_id
    join match_tables mt on mt.id = tp.table_id
    join participants p on p.id = tp.participant_id
    left join communities c on c.id = p.community_id
    where tp.round_id = ${roundId}
      and tp.score is not null
      and tp.table_rank is not null
      and tp.tournament_point is not null
    order by mt.table_number asc, tp.seat_number asc
  `;

  return rows.map((row) => ({
    id: String(row.id),
    tournamentId: String(row.tournament_id),
    roundId: String(row.round_id),
    tableId: String(row.table_id),
    participantId: String(row.participant_id),
    seatNumber: Number(row.seat_number),
    score: Number(row.score),
    tableRank: Number(row.table_rank),
    tournamentPoint: Number(row.tournament_point),
    manualRank: row.manual_rank === null ? null : Number(row.manual_rank),
    tableNumber: Number(row.table_number),
    tableName: row.table_name ? String(row.table_name) : null,
    roundNumber: Number(row.round_number),
    participantName: String(row.participant_name),
    participantNumber: Number(row.participant_number),
    communityName: row.community_name ? String(row.community_name) : null,
  }));
}

async function updateRoundRotationReview({
  tournamentId,
  roundId,
  currentRoundNumber,
  playersPerTable,
}: {
  tournamentId: string;
  roundId: string;
  currentRoundNumber: number;
  playersPerTable: number;
}) {
  const previousTables = await getPreviousTablesForRound(tournamentId, currentRoundNumber);
  const tables = await getRoundArrangement(roundId);
  const { penalty, warnings } = calculateRotationPenalty({
    tables,
    meetingMap: buildMeetingMap(previousTables),
    currentRoundNumber,
    playersPerTable,
  });

  const quality = penalty === 0 ? "EXCELLENT" : penalty <= 500 ? "GOOD" : penalty <= 1500 ? "FAIR" : "NEED_REVIEW";

  await sql`
    update rounds
    set rotation_penalty = ${penalty},
        rotation_quality = ${quality},
        rotation_warnings = ${JSON.stringify(warnings)},
        updated_at = now()
    where id = ${roundId}
  `;
}

async function insertRoundTables({
  tournamentId,
  roundId,
  tables,
}: {
  tournamentId: string;
  roundId: string;
  tables: GeneratedTable[];
}) {
  if (!tables.length) return;

  const tableValues = buildValuesClause(
    tables.map((table) => [table.tableNumber, table.tableName ?? `Meja ${table.tableNumber}`]),
    3
  );
  const playerValues = buildValuesClause(
    tables.flatMap((table) =>
      table.players.map((player, seatIndex) => [
        table.tableNumber,
        player.id,
        seatIndex + 1,
      ])
    ),
    3 + tableValues.params.length
  );

  await sql.query(
    `
      with incoming_tables(table_number, table_name) as (
        values ${tableValues.values}
      ),
      inserted_tables as (
        insert into match_tables (tournament_id, round_id, table_number, table_name)
        select $1, $2, it.table_number::int, it.table_name
        from incoming_tables it
        returning id, table_number
      )
      insert into table_players (tournament_id, round_id, table_id, participant_id, seat_number)
      select $1, $2, inserted_tables.id, incoming_players.participant_id::uuid, incoming_players.seat_number::int
      from (
        values ${playerValues.values}
      ) as incoming_players(table_number, participant_id, seat_number)
      join inserted_tables on inserted_tables.table_number = incoming_players.table_number::int
    `,
    [tournamentId, roundId, ...tableValues.params, ...playerValues.params]
  );
}

async function saveSeedOrder(
  tournamentId: string,
  seededParticipants: { id: string; seedOrder?: number | null }[]
) {
  const orderedParticipants = seededParticipants.filter(
    (participant): participant is { id: string; seedOrder: number } =>
      participant.seedOrder !== null && participant.seedOrder !== undefined
  );

  if (!orderedParticipants.length) return;

  const seedValues = buildValuesClause(
    orderedParticipants.map((participant) => [participant.id, participant.seedOrder]),
    2
  );

  await sql.query(
    `
      update participants
      set seed_order = null,
          updated_at = now()
      where tournament_id = $1
        and id = any($2::uuid[])
    `,
    [tournamentId, orderedParticipants.map((participant) => participant.id)]
  );

  await sql.query(
    `
      update participants p
      set seed_order = incoming.seed_order::int,
          updated_at = now()
      from (
        values ${seedValues.values}
      ) as incoming(id, seed_order)
      where p.id = incoming.id::uuid
        and p.tournament_id = $1
    `,
    [tournamentId, ...seedValues.params]
  );
}

function createRandomTableScores(
  players: Record<string, unknown>[],
  tableNumber: number,
  roundNumber: number
) {
  const usedScores = new Set<number>();

  return players.map((player) => {
    let score = 0;
    do {
      const base = Math.floor(Math.random() * 980) - 240;
      score = base + Number(tableNumber) * 3 + Number(roundNumber) * 7 + Number(player.seat_number);
    } while (usedScores.has(score));

    usedScores.add(score);

    return {
      tablePlayerId: String(player.id),
      participantId: String(player.participant_id),
      score,
    };
  });
}

async function fillSimulationScoresForRound({
  tournamentId,
  roundId,
  auditAction,
  auditDescription,
  requireActive = false,
}: {
  tournamentId: string;
  roundId: string;
  auditAction: string;
  auditDescription: string;
  requireActive?: boolean;
}) {
  const start = Date.now();
  try {
    const [round] = await sql`
      select id, round_number, round_type, status
      from rounds
      where id = ${roundId} and tournament_id = ${tournamentId}
    `;

    if (!round) throw new Error("Babak tidak ditemukan.");
    if (round.status === "locked") throw new Error("Babak sudah dikunci. Skor simulasi tidak mengubah babak locked.");
    if (requireActive && round.status !== "active") throw new Error("Skor simulasi hanya bisa diisi saat babak aktif.");

    const [tables, players] = await Promise.all([
      sql`
        select id, table_number
        from match_tables
        where round_id = ${roundId}
        order by table_number asc
      `,
      sql`
        select id, table_id, participant_id, seat_number
        from table_players
        where round_id = ${roundId}
        order by table_id asc, seat_number asc
      `,
    ]);

    const playersByTable = new Map<string, Record<string, unknown>[]>();
    for (const player of players) {
      const key = String(player.table_id);
      playersByTable.set(key, [...(playersByTable.get(key) ?? []), player]);
    }

    const scoreRows: unknown[][] = [];
    let playerCount = 0;

    for (const table of tables) {
      const tablePlayers = playersByTable.get(String(table.id)) ?? [];
      const scores = createRandomTableScores(tablePlayers, Number(table.table_number), Number(round.round_number));
      const ranking = calculateTableRanking(scores);
      const rankMap = new Map(ranking.rankings.map((row) => [row.participantId, row]));

      for (const item of scores) {
        const rank = rankMap.get(item.participantId);
        playerCount += 1;
        scoreRows.push([
          item.tablePlayerId,
          item.score,
          rank?.tableRank ?? null,
          rank?.tableRank ?? null,
          rank?.tournamentPoint ?? null,
        ]);
      }
    }

    if (scoreRows.length) {
      const scoreValues = buildValuesClause(scoreRows);
      await sql.query(
        `
          update table_players tp
          set score = incoming.score::int,
              manual_rank = incoming.manual_rank::int,
              table_rank = incoming.table_rank::int,
              tournament_point = incoming.tournament_point::int,
              updated_at = now()
          from (
            values ${scoreValues.values}
          ) as incoming(id, score, table_rank, manual_rank, tournament_point)
          where tp.id = incoming.id::uuid
        `,
        scoreValues.params
      );
    }

    await sql`
      update match_tables
      set status = 'submitted', submitted_at = now(), updated_at = now()
      where round_id = ${roundId}
    `;

    await sql`
      insert into audit_logs (tournament_id, round_id, action, description, metadata)
      values (${tournamentId}, ${roundId}, ${auditAction}, ${auditDescription}, ${JSON.stringify({ tables: tables.length, players: playerCount })})
    `;

    return {
      tables: tables.length,
      players: playerCount,
    };
  } finally {
    logPerf(`simulation scores ${roundId}`, start);
  }
}

export async function createTournamentAction(formData: FormData) {
  await requireAuth();

  const parsed = z
    .object({
      name: z.string().min(3),
      eventDate: z.string().optional(),
      location: z.string().optional(),
      isExhibition: z.boolean(),
    })
    .parse({
      name: value(formData, "name"),
      eventDate: value(formData, "eventDate") || undefined,
      location: value(formData, "location") || undefined,
      isExhibition: value(formData, "isExhibition") === "true",
    });

  const [row] = await sql`
    insert into tournaments (name, event_date, location, is_exhibition, qualification_round_count)
    values (${parsed.name}, ${parsed.eventDate ?? null}, ${parsed.location ?? null}, ${parsed.isExhibition}, ${parsed.isExhibition ? 3 : 4})
    returning id
  `;
  redirect(`/tournaments/${row.id}`);
}

export async function updateTournamentAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
    name: z.string().min(3),
    eventDate: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["draft", "active", "finished", "cancelled"]),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
    name: value(formData, "name"),
    eventDate: value(formData, "eventDate") || undefined,
    location: value(formData, "location") || undefined,
    status: value(formData, "status"),
  });

  await sql`
    update tournaments
    set name = ${parsed.name},
        event_date = ${parsed.eventDate ?? null},
        location = ${parsed.location ?? null},
        status = ${parsed.status},
        updated_at = now()
    where id = ${parsed.tournamentId}
  `;

  revalidatePath("/");
  revalidatePath(`/tournaments/${parsed.tournamentId}`);
}

export async function deleteTournamentAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
  });

  await sql`
    delete from tournaments
    where id = ${parsed.tournamentId}
  `;

  revalidatePath("/");
}

export async function createCommunityAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const name = formatCommunityDisplayName(value(formData, "name"));

  await sql`
    insert into communities (tournament_id, name, normalized_name)
    values (${tournamentId}, ${name}, ${normalizeCommunityName(name)})
    on conflict (tournament_id, normalized_name)
    do update set name = excluded.name, updated_at = now()
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/communities`);
}

export async function updateCommunityAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
    communityId: z.string().uuid(),
    name: z.string().min(2),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
    communityId: value(formData, "communityId"),
    name: formatCommunityDisplayName(value(formData, "name")),
  });

  await sql`
    update communities
    set name = ${parsed.name},
        normalized_name = ${normalizeCommunityName(parsed.name)},
        updated_at = now()
    where id = ${parsed.communityId}
      and tournament_id = ${parsed.tournamentId}
  `;

  revalidatePath(`/tournaments/${parsed.tournamentId}`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/communities`);
}

export async function deleteCommunityAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
    communityId: z.string().uuid(),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
    communityId: value(formData, "communityId"),
  });

  await sql`
    delete from communities
    where id = ${parsed.communityId}
      and tournament_id = ${parsed.tournamentId}
  `;

  revalidatePath(`/tournaments/${parsed.tournamentId}`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/communities`);
}

export async function createParticipantAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const communityId = value(formData, "communityId") || null;
  const participantNumber = Number(value(formData, "participantNumber"));
  const name = value(formData, "name");
  const phone = value(formData, "phone") || null;

  z.object({
    tournamentId: z.string().uuid(),
    participantNumber: z.number().int().positive(),
    name: z.string().min(2),
  }).parse({ tournamentId, participantNumber, name });

  await sql`
    insert into participants (tournament_id, community_id, participant_number, name, phone)
    values (${tournamentId}, ${communityId}, ${participantNumber}, ${name}, ${phone})
    on conflict (tournament_id, participant_number)
    do update set
      community_id = excluded.community_id,
      name = excluded.name,
      phone = excluded.phone,
      updated_at = now()
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/participants`);
}

export async function updateParticipantAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const participantId = value(formData, "participantId");
  const communityId = value(formData, "communityId") || null;
  const participantNumber = Number(value(formData, "participantNumber"));
  const name = value(formData, "name");
  const phone = value(formData, "phone") || null;
  const status = value(formData, "status");

  z.object({
    tournamentId: z.string().uuid(),
    participantId: z.string().uuid(),
    participantNumber: z.number().int().positive(),
    name: z.string().min(2),
    status: z.enum(["active", "withdrawn", "disqualified"]),
  }).parse({ tournamentId, participantId, participantNumber, name, status });

  await sql`
    update participants
    set community_id = ${communityId},
        participant_number = ${participantNumber},
        name = ${name},
        phone = ${phone},
        status = ${status},
        updated_at = now()
    where id = ${participantId}
      and tournament_id = ${tournamentId}
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/participants`);
}

export async function deleteParticipantAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
    participantId: z.string().uuid(),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
    participantId: value(formData, "participantId"),
  });

  const [{ used_count: usedCount }] = await sql`
    select (
      (select count(*) from table_players where tournament_id = ${parsed.tournamentId} and participant_id = ${parsed.participantId}) +
      (select count(*) from finalists where tournament_id = ${parsed.tournamentId} and participant_id = ${parsed.participantId})
    )::int as used_count
  `;

  if (Number(usedCount) > 0) {
    throw new Error("Peserta sudah masuk babak. Ubah status menjadi withdrawn/disqualified jika tidak ikut lanjut.");
  }

  await sql`
    delete from participants
    where id = ${parsed.participantId}
      and tournament_id = ${parsed.tournamentId}
  `;

  revalidatePath(`/tournaments/${parsed.tournamentId}`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);
}

export async function importParticipantsAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const csv = value(formData, "csv");
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().includes("nama") ? lines.slice(1) : lines;
  const communityNames = [...new Set(dataLines
    .map((line) => line.split(",").map((part) => part?.trim() ?? "")[2])
    .filter(Boolean)
    .map((communityRaw) => formatCommunityDisplayName(communityRaw as string)))];
  const communityIds = new Map<string, string>();

  if (communityNames.length) {
    const communityValues = buildValuesClause(
      communityNames.map((displayName) => [tournamentId, displayName, normalizeCommunityName(displayName)])
    );
    const communities = await sql.query(
      `
        insert into communities (tournament_id, name, normalized_name)
        values ${communityValues.values}
        on conflict (tournament_id, normalized_name)
        do update set name = excluded.name, updated_at = now()
        returning id, name
      `,
      communityValues.params
    );

    for (const community of communities) {
      communityIds.set(formatCommunityDisplayName(String(community.name)), String(community.id));
    }
  }

  const participantRows = dataLines
    .map((line) => line.split(",").map((part) => part?.trim() ?? ""))
    .map(([numberRaw, nameRaw, communityRaw, phoneRaw]): [string, string | null, number, string, string | null] | null => {
      const participantNumber = Number(numberRaw);
      if (!participantNumber || !nameRaw) return null;

      let communityId: string | null = null;
      if (communityRaw) {
        const displayName = formatCommunityDisplayName(communityRaw);
        communityId = communityIds.get(displayName) ?? null;
      }

      return [tournamentId, communityId, participantNumber, nameRaw, phoneRaw || null];
    })
    .filter((row): row is [string, string | null, number, string, string | null] => row !== null);

  const participantValues = buildValuesClause(participantRows);

  if (participantValues.params.length) {
    await sql.query(
      `
        insert into participants (tournament_id, community_id, participant_number, name, phone)
        values ${participantValues.values}
        on conflict (tournament_id, participant_number)
        do update set
          community_id = excluded.community_id,
          name = excluded.name,
          phone = excluded.phone,
          updated_at = now()
      `,
      participantValues.params
    );
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/participants`);
  revalidatePath(`/tournaments/${tournamentId}/communities`);
}

export async function seedSimulationCommunitiesAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  z.string().uuid().parse(tournamentId);

  await upsertSimulationCommunities(tournamentId);
  await sql`
    insert into audit_logs (tournament_id, action, description)
    values (${tournamentId}, 'SIMULATION_COMMUNITIES', 'Mengisi komunitas contoh untuk simulasi.')
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/communities`);
}

export async function seedSimulationParticipantsAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  z.string().uuid().parse(tournamentId);

  const communityIds = await upsertSimulationCommunities(tournamentId);
  const communityNames = [...communityIds.keys()];

  const participantValues = buildValuesClause(
    simulationNames.map((name, index) => {
      const communityName = communityNames[index % communityNames.length];
      return [tournamentId, communityIds.get(communityName) ?? null, index + 1, name, null];
    })
  );

  await sql.query(
    `
      insert into participants (tournament_id, community_id, participant_number, name, phone)
      values ${participantValues.values}
      on conflict (tournament_id, participant_number)
      do update set
        community_id = excluded.community_id,
        name = excluded.name,
        phone = excluded.phone,
        status = 'active',
        updated_at = now()
    `,
    participantValues.params
  );

  await sql`
    insert into audit_logs (tournament_id, action, description, metadata)
    values (${tournamentId}, 'SIMULATION_PARTICIPANTS', 'Mengisi 50 peserta contoh untuk simulasi.', ${JSON.stringify({ count: simulationNames.length })})
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/participants`);
  revalidatePath(`/tournaments/${tournamentId}/communities`);
}

export async function seedSimulationScoresAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  z.string().uuid().parse(tournamentId);

  const [round] = await sql`
    select id, round_number, round_type, status
    from rounds
    where tournament_id = ${tournamentId}
    order by created_at desc
    limit 1
  `;

  if (!round) throw new Error("Belum ada babak. Buat babak dulu sebelum isi skor simulasi.");

  await fillSimulationScoresForRound({
    tournamentId,
    roundId: String(round.id),
    auditAction: "SIMULATION_SCORES",
    auditDescription: "Mengisi skor dan ranking manual simulasi untuk semua meja pada babak terakhir.",
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${round.id}`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
}

export async function seedRoundSimulationScoresAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");
  z.string().uuid().parse(tournamentId);
  z.string().uuid().parse(roundId);

  await fillSimulationScoresForRound({
    tournamentId,
    roundId,
    auditAction: "SIMULATION_ROUND_SCORES",
    auditDescription: "Mengisi skor dan ranking manual simulasi untuk semua meja pada babak ini.",
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
}

export async function seedFinalSimulationScoresAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");
  z.string().uuid().parse(tournamentId);
  z.string().uuid().parse(roundId);

  await fillSimulationScoresForRound({
    tournamentId,
    roundId,
    auditAction: "SIMULATION_FINAL_SCORES",
    auditDescription: "Mengisi skor simulasi untuk semua meja final.",
    requireActive: true,
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
}

export async function lockFinalAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");
  z.string().uuid().parse(tournamentId);
  z.string().uuid().parse(roundId);

  const [round] = await sql`
    select id, round_type, status
    from rounds
    where id = ${roundId} and tournament_id = ${tournamentId}
  `;

  if (!round) throw new Error("Final tidak ditemukan.");
  if (round.round_type !== "final") throw new Error("Action ini hanya untuk final.");

  const [{ incomplete_count: incompleteCount }] = await sql`
    select count(*)::int as incomplete_count
    from table_players tp
    join match_tables mt on mt.id = tp.table_id
    where tp.round_id = ${roundId}
      and (mt.status <> 'submitted' or tp.score is null or tp.table_rank is null or tp.tournament_point is null)
  `;

  if (Number(incompleteCount) > 0) {
    redirect(`/tournaments/${tournamentId}/final?error=final-incomplete&missing=${Number(incompleteCount)}`);
  }

  await sql`update rounds set status = 'locked', locked_at = now(), updated_at = now() where id = ${roundId}`;
  await sql`update match_tables set status = 'locked', updated_at = now() where round_id = ${roundId}`;
  await sql`update tournaments set status = 'finished', updated_at = now() where id = ${tournamentId}`;
  await sql`
    insert into audit_logs (tournament_id, round_id, action, description)
    values (${tournamentId}, ${roundId}, 'LOCK_FINAL', 'Admin mengunci final dan menyelesaikan turnamen.')
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  redirect(`/tournaments/${tournamentId}/final`);
}

export async function generateRoundAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const tournamentPromise = getTournament(tournamentId);
  const participantsPromise = getParticipants(tournamentId);
  const previousTablesPromise = getPreviousTables(tournamentId);
  const tournament = await tournamentPromise;
  if (!tournament) throw new Error("Turnamen tidak ditemukan.");

  const participants = (await participantsPromise).filter((participant) => participant.status === "active");
  if (participants.length < 10) {
    redirect(`/tournaments/${tournamentId}/game?error=not-enough-participants`);
  }

  const [{ next_round_number: nextRoundNumber }] = await sql`
    select coalesce(max(round_number), 0) + 1 as next_round_number
    from rounds
    where tournament_id = ${tournamentId} and round_type = 'qualification'
  `;
  const qualificationRoundTarget = tournament.isExhibition ? 3 : tournament.qualificationRoundCount;

  if (Number(nextRoundNumber) > qualificationRoundTarget) {
    redirect(`/tournaments/${tournamentId}/game?error=qualification-round-limit`);
  }

  if (Number(nextRoundNumber) > 1) {
    const [{ draft_count: draftCount }] = await sql`
      select count(*)::int as draft_count
      from rounds
      where tournament_id = ${tournamentId}
        and round_type = 'qualification'
        and round_number = ${Number(nextRoundNumber) - 1}
        and status = 'draft'
    `;
    if (Number(draftCount) > 0) {
      redirect(`/tournaments/${tournamentId}/game?error=previous-round-draft`);
    }
  }

  const tableCount = Math.ceil(participants.length / tournament.playersPerTable);
  const rotation = await buildRoundRotation({
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      communityId: participant.communityId,
      seedOrder: participant.seedOrder,
    })),
    previousTables: await previousTablesPromise,
    tableCount,
    playersPerTable: tournament.playersPerTable,
    currentRoundNumber: Number(nextRoundNumber),
  });
  await saveSeedOrder(tournamentId, rotation.seededParticipants);

  const [round] = await sql`
    insert into rounds (tournament_id, round_number, round_type, status, rotation_penalty, rotation_quality, rotation_warnings)
    values (${tournamentId}, ${Number(nextRoundNumber)}, 'qualification', 'draft', ${rotation.totalPenalty}, ${rotation.quality}, ${JSON.stringify(rotation.warnings)})
    returning id
  `;

  await insertRoundTables({ tournamentId, roundId: String(round.id), tables: rotation.tables });

  logPerf(`generate round ${tournamentId}`, start);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  redirect(`/tournaments/${tournamentId}/rounds/${round.id}`);
}

export async function deleteRoundAction(formData: FormData) {
  await requireAuth();

  const parsed = z.object({
    tournamentId: z.string().uuid(),
    roundId: z.string().uuid(),
  }).parse({
    tournamentId: value(formData, "tournamentId"),
    roundId: value(formData, "roundId"),
  });

  const [round] = await sql`
    select id, round_type, round_number
    from rounds
    where id = ${parsed.roundId}
      and tournament_id = ${parsed.tournamentId}
  `;

  if (!round) throw new Error("Babak tidak ditemukan.");

  const [lastRound] = await sql`
    select id
    from rounds
    where tournament_id = ${parsed.tournamentId}
    order by case when round_type = 'final' then 2 when round_type = 'semifinal' then 1 else 0 end desc,
             round_number desc,
             created_at desc
    limit 1
  `;

  if (!lastRound || String(lastRound.id) !== parsed.roundId) {
    throw new Error("Hanya babak paling akhir yang boleh dihapus.");
  }

  await sql`
    insert into audit_logs (tournament_id, round_id, action, description, metadata)
    values (
      ${parsed.tournamentId},
      ${parsed.roundId},
      'DELETE_ROUND',
      'Admin menghapus babak paling akhir.',
      ${JSON.stringify({ roundType: round.round_type, roundNumber: Number(round.round_number) })}
    )
  `;

  if (round.round_type === "final") {
    await sql`delete from finalists where tournament_id = ${parsed.tournamentId}`;
  }

  await sql`
    delete from rounds
    where id = ${parsed.roundId}
      and tournament_id = ${parsed.tournamentId}
  `;

  const [statusSummary] = await sql`
    select
      count(*)::int as round_count,
      count(*) filter (where round_type = 'final' and status = 'locked')::int as locked_final_count,
      count(*) filter (where status = 'active')::int as active_round_count
    from rounds
    where tournament_id = ${parsed.tournamentId}
  `;

  const nextStatus =
    Number(statusSummary?.locked_final_count ?? 0) > 0
      ? "finished"
      : Number(statusSummary?.round_count ?? 0) > 0 || Number(statusSummary?.active_round_count ?? 0) > 0
        ? "active"
        : "draft";

  await sql`
    update tournaments
    set status = ${nextStatus},
        updated_at = now()
    where id = ${parsed.tournamentId}
  `;

  revalidatePath(`/tournaments/${parsed.tournamentId}`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/standings`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/final`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/viewer`);
  revalidatePath(`/tournaments/${parsed.tournamentId}/game`);
}

export async function reshuffleDraftRoundAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Turnamen tidak ditemukan.");

  const [round] = await sql`
    select id, round_number, round_type, status
    from rounds
    where id = ${roundId} and tournament_id = ${tournamentId}
  `;

  if (!round) throw new Error("Babak tidak ditemukan.");
  if (round.round_type !== "qualification") throw new Error("Shuffle ulang hanya untuk babak penyisihan.");
  if (round.status !== "draft") throw new Error("Shuffle ulang hanya boleh saat babak masih draft.");

  const participants = (await getParticipants(tournamentId)).filter((participant) => participant.status === "active");
  if (participants.length < 10) throw new Error("Minimal 10 peserta aktif untuk shuffle ulang.");

  const tableCount = Math.ceil(participants.length / tournament.playersPerTable);
  const currentRoundNumber = Number(round.round_number);
  const rotation = await buildRoundRotation({
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      communityId: participant.communityId,
      seedOrder: participant.seedOrder,
    })),
    previousTables: await getPreviousTablesForRound(tournamentId, currentRoundNumber),
    tableCount,
    playersPerTable: tournament.playersPerTable,
    currentRoundNumber,
    variationSwapCount: 8,
    maxIterations: 150,
  });
  await saveSeedOrder(tournamentId, rotation.seededParticipants);

  await sql`delete from match_tables where round_id = ${roundId}`;
  await insertRoundTables({ tournamentId, roundId, tables: rotation.tables });
  await sql`
    update rounds
    set rotation_penalty = ${rotation.totalPenalty},
        rotation_quality = ${rotation.quality},
        rotation_warnings = ${JSON.stringify(rotation.warnings)},
        updated_at = now()
    where id = ${roundId}
  `;
  await sql`
    insert into audit_logs (tournament_id, round_id, action, description, metadata)
    values (${tournamentId}, ${roundId}, 'RESHUFFLE_DRAFT_ROUND', 'Admin melakukan shuffle ulang draft babak.', ${JSON.stringify({ penalty: rotation.totalPenalty, quality: rotation.quality })})
  `;

  logPerf(`reshuffle round ${roundId}`, start);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export async function activateRoundAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");

  await sql`update rounds set status = 'active', updated_at = now() where id = ${roundId}`;
  await sql`update tournaments set status = 'active', updated_at = now() where id = ${tournamentId}`;
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export async function submitScoresAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const tableId = value(formData, "tableId");
  const roundId = value(formData, "roundId");
  const playerIds = formData.getAll("tablePlayerId").map(String);

  const [round] = await sql`
    select id, round_type, status
    from rounds
    where id = ${roundId} and tournament_id = ${tournamentId}
  `;

  if (!round) throw new Error("Babak tidak ditemukan.");
  if (round.status !== "active") {
    throw new Error("Input skor hanya bisa dilakukan saat babak aktif.");
  }

  const scores = playerIds.map((id) => ({
    tablePlayerId: id,
    participantId: value(formData, `participantId-${id}`),
    score: Number(value(formData, `score-${id}`)),
    manualRank: null,
  }));

  if (scores.some((item) => Number.isNaN(item.score))) {
    throw new Error("Semua skor harus berupa angka.");
  }

  const ranking = calculateTableRanking(scores);
  const rankMap = new Map(ranking.rankings.map((row) => [row.participantId, row]));

  const scoreValues = buildValuesClause(
    scores.map((item) => {
      const rank = rankMap.get(item.participantId);
      return [
        item.tablePlayerId,
        item.score,
        item.manualRank,
        rank?.tableRank ?? null,
        rank?.tournamentPoint ?? null,
      ];
    })
  );

  await sql.query(
    `
      update table_players tp
      set score = incoming.score::int,
          manual_rank = incoming.manual_rank::int,
          table_rank = incoming.table_rank::int,
          tournament_point = incoming.tournament_point::int,
          updated_at = now()
      from (
        values ${scoreValues.values}
      ) as incoming(id, score, manual_rank, table_rank, tournament_point)
      where tp.id = incoming.id::uuid
    `,
    scoreValues.params
  );

  await sql`update match_tables set status = 'submitted', submitted_at = now(), updated_at = now() where id = ${tableId}`;
  logPerf(`submit scores ${tableId}`, start);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
  if (round.round_type === "final") {
    redirect(`/tournaments/${tournamentId}/final`);
  }
  redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export async function lockRoundAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");

  const [{ incomplete_count: incompleteCount }] = await sql`
    select count(*)::int as incomplete_count
    from table_players tp
    join match_tables mt on mt.id = tp.table_id
    where tp.round_id = ${roundId}
      and (mt.status <> 'submitted' or tp.score is null or tp.table_rank is null or tp.tournament_point is null)
  `;

  if (Number(incompleteCount) > 0) {
    redirect(`/tournaments/${tournamentId}/rounds/${roundId}?error=round-incomplete&missing=${Number(incompleteCount)}`);
  }

  await sql`update rounds set status = 'locked', locked_at = now(), updated_at = now() where id = ${roundId}`;
  await sql`update match_tables set status = 'locked', updated_at = now() where round_id = ${roundId}`;
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/viewer`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
  redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export async function swapParticipantsAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");
  const first = value(formData, "firstTablePlayerId");
  const second = value(formData, "secondTablePlayerId");
  if (!first || !second || first === second) return;

  const [currentRound] = await sql`
    select round_type, status
    from rounds
    where id = ${roundId} and tournament_id = ${tournamentId}
  `;
  if (!currentRound) throw new Error("Babak tidak ditemukan.");
  if (currentRound.status !== "draft") throw new Error("Koreksi manual hanya boleh saat babak masih draft.");

  const rows = await sql`
    select id, table_id, seat_number, participant_id
    from table_players
    where id in (${first}, ${second})
  `;
  if (rows.length !== 2) throw new Error("Peserta untuk ditukar tidak lengkap.");

  const a = rows[0];
  const b = rows[1];
  await sql`
    update table_players
    set seat_number = -1, updated_at = now()
    where id = ${a.id}
  `;
  await sql`
    update table_players
    set table_id = ${a.table_id}, seat_number = ${a.seat_number}, updated_at = now()
    where id = ${b.id}
  `;
  await sql`
    update table_players
    set table_id = ${b.table_id}, seat_number = ${b.seat_number}, updated_at = now()
    where id = ${a.id}
  `;

  await sql`
    insert into audit_logs (tournament_id, round_id, action, description, metadata)
    values (${tournamentId}, ${roundId}, 'SWAP_PARTICIPANTS', 'Admin menukar peserta antar meja.', ${JSON.stringify({ first, second })})
  `;

  const [tournament, round] = await Promise.all([
    getTournament(tournamentId),
    sql`select round_number, round_type from rounds where id = ${roundId}`,
  ]);
  if (tournament && round[0] && round[0].round_type === "qualification") {
    await updateRoundRotationReview({
      tournamentId,
      roundId,
      currentRoundNumber: Number(round[0].round_number),
      playersPerTable: tournament.playersPerTable,
    });
  }

  revalidatePath(`/tournaments/${tournamentId}/viewer`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
}

export async function generateFinalAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const [tournament, rows] = await Promise.all([
    getTournament(tournamentId),
    getScoredQualificationPlayers(tournamentId),
  ]);
  if (!tournament) throw new Error("Turnamen tidak ditemukan.");

  const standings = calculateStandings(rows);
  const qualificationRoundTarget = tournament.isExhibition ? 3 : tournament.qualificationRoundCount;
  const [{ locked_qualification_count: lockedQualificationCount }] = await sql`
    select count(*)::int as locked_qualification_count
    from rounds
    where tournament_id = ${tournamentId}
      and round_type = 'qualification'
      and status = 'locked'
  `;

  if (tournament.isExhibition) {
    if (Number(lockedQualificationCount) < qualificationRoundTarget) {
      redirect(`/tournaments/${tournamentId}/game?error=qualification-incomplete`);
    }

    const [semifinalRound] = await sql`
      select id, status
      from rounds
      where tournament_id = ${tournamentId}
        and round_type = 'semifinal'
      order by round_number desc
      limit 1
    `;
    const [finalRound] = await sql`
      select id
      from rounds
      where tournament_id = ${tournamentId}
        and round_type = 'final'
      limit 1
    `;

    if (!semifinalRound) {
      const semifinalTables = generateExhibitionSemifinalTables(standings);
      await sql`delete from rounds where tournament_id = ${tournamentId} and round_type in ('semifinal', 'final')`;

      const [round] = await sql`
        insert into rounds (tournament_id, round_number, round_type, status)
        values (${tournamentId}, 1, 'semifinal', 'draft')
        returning id
      `;

      await insertRoundTables({
        tournamentId,
        roundId: String(round.id),
        tables: semifinalTables,
      });

      logPerf(`generate exhibition semifinal ${tournamentId}`, start);
      revalidatePath(`/tournaments/${tournamentId}/game`);
      redirect(`/tournaments/${tournamentId}/rounds/${round.id}`);
    }

    if (String(semifinalRound.status) !== "locked") {
      redirect(`/tournaments/${tournamentId}/game?error=semifinal-unlocked`);
    }

    if (finalRound) {
      redirect(`/tournaments/${tournamentId}/final`);
    }

    const semifinalPlayers = await getScoredRoundPlayers(String(semifinalRound.id));
    const upperPlayers = semifinalPlayers.filter((player) => player.tableName?.startsWith("Semi Atas"));
    const lowerPlayers = semifinalPlayers.filter((player) => player.tableName?.startsWith("Semi Bawah"));
    const upperSemifinalStandings = calculateStandings(upperPlayers);
    const lowerSemifinalStandings = calculateStandings(lowerPlayers);
    const finalTables = generateExhibitionFinalTables({
      upperSemifinalStandings,
      lowerSemifinalStandings,
    });

    const [round] = await sql`
      insert into rounds (tournament_id, round_number, round_type, status)
      values (${tournamentId}, 1, 'final', 'draft')
      returning id
    `;

    await insertRoundTables({
      tournamentId,
      roundId: String(round.id),
      tables: finalTables,
    });

    logPerf(`generate exhibition final ${tournamentId}`, start);
    revalidatePath(`/tournaments/${tournamentId}/game`);
    redirect(`/tournaments/${tournamentId}/final`);
  }

  const finalists = standings.slice(0, tournament.finalistCount);
  if (finalists.length < tournament.finalistCount) throw new Error("Data finalis belum cukup.");

  await sql`delete from rounds where tournament_id = ${tournamentId} and round_type = 'final'`;
  await sql`delete from finalists where tournament_id = ${tournamentId}`;

  const finalistValues = buildValuesClause(
    finalists.map((finalist, index) => [tournamentId, finalist.participantId, index + 1])
  );

  await sql.query(
    `
      insert into finalists (tournament_id, participant_id, qualification_rank)
      select incoming.tournament_id::uuid, incoming.participant_id::uuid, incoming.qualification_rank::int
      from (
        values ${finalistValues.values}
      ) as incoming(tournament_id, participant_id, qualification_rank)
    `,
    finalistValues.params
  );

  const [round] = await sql`
    insert into rounds (tournament_id, round_number, round_type, status)
    values (${tournamentId}, 1, 'final', 'draft')
    returning id
  `;

  const finalTables = generateFinalTables(finalists);
  await insertRoundTables({
    tournamentId,
    roundId: String(round.id),
    tables: finalTables.map((table) => ({
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      players: table.players.map((player) => ({
        id: player.participantId,
        name: player.name,
        communityId: null,
      })),
    })),
  });

  logPerf(`generate final ${tournamentId}`, start);
  revalidatePath(`/tournaments/${tournamentId}/game`);
  redirect(`/tournaments/${tournamentId}/final`);
}
