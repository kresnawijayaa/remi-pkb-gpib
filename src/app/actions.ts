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
import { generateFinalTables } from "@/lib/tournament/final";
import {
  buildMeetingMap,
  calculateRotationPenalty,
  generateRotation,
  type GeneratedTable,
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

  const communities = await Promise.all(simulationCommunities.map(async (rawName) => {
    const name = formatCommunityDisplayName(rawName);
    const [community] = await sql`
      insert into communities (tournament_id, name, normalized_name)
      values (${tournamentId}, ${name}, ${normalizeCommunityName(name)})
      on conflict (tournament_id, normalized_name)
      do update set name = excluded.name, updated_at = now()
      returning id, name
    `;

    return community;
  }));

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
  for (const table of tables) {
    const [matchTable] = await sql`
      insert into match_tables (tournament_id, round_id, table_number, table_name)
      values (${tournamentId}, ${roundId}, ${table.tableNumber}, ${`Meja ${table.tableNumber}`})
      returning id
    `;

    await Promise.all(table.players.map((player, seatIndex) =>
      sql`
        insert into table_players (tournament_id, round_id, table_id, participant_id, seat_number)
        values (${tournamentId}, ${roundId}, ${matchTable.id}, ${player.id}, ${seatIndex + 1})
      `
    ));
  }
}

async function saveSeedOrder(
  tournamentId: string,
  seededParticipants: { id: string; seedOrder?: number | null }[]
) {
  await Promise.all(seededParticipants
    .filter((participant) => participant.seedOrder)
    .map((participant) =>
      sql`
      update participants
      set seed_order = ${participant.seedOrder}, updated_at = now()
      where id = ${participant.id} and tournament_id = ${tournamentId}
    `
    ));
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

  const tables = await sql`
    select id, table_number
    from match_tables
    where round_id = ${roundId}
    order by table_number asc
  `;

  const players = await sql`
    select id, table_id, participant_id, seat_number
    from table_players
    where round_id = ${roundId}
    order by table_id asc, seat_number asc
  `;

  const playersByTable = new Map<string, Record<string, unknown>[]>();
  for (const player of players) {
    const key = String(player.table_id);
    playersByTable.set(key, [...(playersByTable.get(key) ?? []), player]);
  }

  let playerCount = 0;

  for (const table of tables) {
    const tablePlayers = playersByTable.get(String(table.id)) ?? [];
    const scores = createRandomTableScores(tablePlayers, Number(table.table_number), Number(round.round_number));
    const ranking = calculateTableRanking(scores);
    const rankMap = new Map(ranking.rankings.map((row) => [row.participantId, row]));

    await Promise.all(scores.map((item) => {
      const rank = rankMap.get(item.participantId);
      playerCount += 1;

      return sql`
        update table_players
        set score = ${item.score},
            manual_rank = ${rank?.tableRank ?? null},
            table_rank = ${rank?.tableRank ?? null},
            tournament_point = ${rank?.tournamentPoint ?? null},
            updated_at = now()
        where id = ${item.tablePlayerId}
      `;
    }));

    await sql`
      update match_tables
      set status = 'submitted', submitted_at = now(), updated_at = now()
      where id = ${table.id}
    `;
  }

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
    })
    .parse({
      name: value(formData, "name"),
      eventDate: value(formData, "eventDate") || undefined,
      location: value(formData, "location") || undefined,
    });

  const [row] = await sql`
    insert into tournaments (name, event_date, location)
    values (${parsed.name}, ${parsed.eventDate ?? null}, ${parsed.location ?? null})
    returning id
  `;
  redirect(`/tournaments/${row.id}`);
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
}

export async function importParticipantsAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const csv = value(formData, "csv");
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().includes("nama") ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const [numberRaw, nameRaw, communityRaw, phoneRaw] = line.split(",").map((part) => part?.trim() ?? "");
    const participantNumber = Number(numberRaw);
    if (!participantNumber || !nameRaw) continue;

    let communityId: string | null = null;
    if (communityRaw) {
      const displayName = formatCommunityDisplayName(communityRaw);
      const [community] = await sql`
        insert into communities (tournament_id, name, normalized_name)
        values (${tournamentId}, ${displayName}, ${normalizeCommunityName(displayName)})
        on conflict (tournament_id, normalized_name)
        do update set name = excluded.name, updated_at = now()
        returning id
      `;
      communityId = String(community.id);
    }

    await sql`
      insert into participants (tournament_id, community_id, participant_number, name, phone)
      values (${tournamentId}, ${communityId}, ${participantNumber}, ${nameRaw}, ${phoneRaw || null})
      on conflict (tournament_id, participant_number)
      do update set
        community_id = excluded.community_id,
        name = excluded.name,
        phone = excluded.phone,
        updated_at = now()
    `;
  }

  revalidatePath(`/tournaments/${tournamentId}`);
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
}

export async function seedSimulationParticipantsAction(formData: FormData) {
  await requireAuth();
  assertDeveloperSimulationPin(formData);

  const tournamentId = value(formData, "tournamentId");
  z.string().uuid().parse(tournamentId);

  const communityIds = await upsertSimulationCommunities(tournamentId);
  const communityNames = [...communityIds.keys()];

  await Promise.all(simulationNames.map((name, index) => {
    const communityName = communityNames[index % communityNames.length];
    return sql`
      insert into participants (tournament_id, community_id, participant_number, name, phone)
      values (${tournamentId}, ${communityIds.get(communityName)}, ${index + 1}, ${name}, null)
      on conflict (tournament_id, participant_number)
      do update set
        community_id = excluded.community_id,
        name = excluded.name,
        phone = excluded.phone,
        status = 'active',
        updated_at = now()
    `;
  }));

  await sql`
    insert into audit_logs (tournament_id, action, description, metadata)
    values (${tournamentId}, 'SIMULATION_PARTICIPANTS', 'Mengisi 50 peserta contoh untuk simulasi.', ${JSON.stringify({ count: simulationNames.length })})
  `;

  revalidatePath(`/tournaments/${tournamentId}`);
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
  redirect(`/tournaments/${tournamentId}/final`);
}

export async function generateRoundAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Turnamen tidak ditemukan.");

  const participants = (await getParticipants(tournamentId)).filter((participant) => participant.status === "active");
  if (participants.length < 10) {
    redirect(`/tournaments/${tournamentId}?error=not-enough-participants`);
  }

  const [{ next_round_number: nextRoundNumber }] = await sql`
    select coalesce(max(round_number), 0) + 1 as next_round_number
    from rounds
    where tournament_id = ${tournamentId} and round_type = 'qualification'
  `;

  if (Number(nextRoundNumber) > tournament.qualificationRoundCount) {
    redirect(`/tournaments/${tournamentId}?error=qualification-round-limit`);
  }

  if (Number(nextRoundNumber) > 1) {
    const [{ unlocked_count: unlockedCount }] = await sql`
      select count(*)::int as unlocked_count
      from rounds
      where tournament_id = ${tournamentId}
        and round_type = 'qualification'
        and round_number = ${Number(nextRoundNumber) - 1}
        and status <> 'locked'
    `;
    if (Number(unlockedCount) > 0) {
      redirect(`/tournaments/${tournamentId}?error=previous-round-unlocked`);
    }
  }

  const tableCount = Math.ceil(participants.length / tournament.playersPerTable);
  const rotation = generateRotation({
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      communityId: participant.communityId,
      seedOrder: participant.seedOrder,
    })),
    previousTables: await getPreviousTables(tournamentId),
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
  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/rounds/${round.id}`);
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
  const rotation = generateRotation({
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
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export async function activateRoundAction(formData: FormData) {
  await requireAuth();

  const tournamentId = value(formData, "tournamentId");
  const roundId = value(formData, "roundId");

  await sql`update rounds set status = 'active', updated_at = now() where id = ${roundId}`;
  await sql`update tournaments set status = 'active', updated_at = now() where id = ${tournamentId}`;
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
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

  await Promise.all(scores.map((item) => {
    const rank = rankMap.get(item.participantId);
    return sql`
      update table_players
      set score = ${item.score},
          manual_rank = ${item.manualRank},
          table_rank = ${rank?.tableRank ?? null},
          tournament_point = ${rank?.tournamentPoint ?? null},
          updated_at = now()
      where id = ${item.tablePlayerId}
    `;
  }));

  await sql`update match_tables set status = 'submitted', submitted_at = now(), updated_at = now() where id = ${tableId}`;
  logPerf(`submit scores ${tableId}`, start);
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

  const tournament = await getTournament(tournamentId);
  const round = await sql`select round_number, round_type from rounds where id = ${roundId}`;
  if (tournament && round[0] && round[0].round_type === "qualification") {
    await updateRoundRotationReview({
      tournamentId,
      roundId,
      currentRoundNumber: Number(round[0].round_number),
      playersPerTable: tournament.playersPerTable,
    });
  }

  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
  revalidatePath(`/tournaments/${tournamentId}/final`);
}

export async function generateFinalAction(formData: FormData) {
  await requireAuth();
  const start = Date.now();

  const tournamentId = value(formData, "tournamentId");
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Turnamen tidak ditemukan.");

  const rows = await getScoredQualificationPlayers(tournamentId);
  const standings = calculateStandings(rows);
  const finalists = standings.slice(0, tournament.finalistCount);
  if (finalists.length < tournament.finalistCount) throw new Error("Data finalis belum cukup.");

  await sql`delete from rounds where tournament_id = ${tournamentId} and round_type = 'final'`;
  await sql`delete from finalists where tournament_id = ${tournamentId}`;

  for (const [index, finalist] of finalists.entries()) {
    await sql`
      insert into finalists (tournament_id, participant_id, qualification_rank)
      values (${tournamentId}, ${finalist.participantId}, ${index + 1})
    `;
  }

  const [round] = await sql`
    insert into rounds (tournament_id, round_number, round_type, status)
    values (${tournamentId}, 1, 'final', 'draft')
    returning id
  `;

  const finalTables = generateFinalTables(finalists);
  for (const table of finalTables) {
    const [matchTable] = await sql`
      insert into match_tables (tournament_id, round_id, table_number, table_name)
      values (${tournamentId}, ${round.id}, ${table.tableNumber}, ${table.tableName})
      returning id
    `;

    for (const [seatIndex, player] of table.players.entries()) {
      await sql`
        insert into table_players (tournament_id, round_id, table_id, participant_id, seat_number)
        values (${tournamentId}, ${round.id}, ${matchTable.id}, ${player.participantId}, ${seatIndex + 1})
      `;
    }
  }

  logPerf(`generate final ${tournamentId}`, start);
  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/final`);
}
