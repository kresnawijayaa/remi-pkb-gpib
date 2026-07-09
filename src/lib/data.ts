import type { Community, MatchTable, Participant, Round, TablePlayer, Tournament } from "@/types/tournament";
import { sql, toCamelRow, toCamelRows } from "@/lib/db";

export async function getTournaments() {
  const rows = await sql`
    select
      id,
      name,
      event_date,
      location,
      status,
      is_exhibition,
      qualification_round_count,
      players_per_table,
      finalist_count,
      created_at,
      updated_at
    from tournaments
    order by created_at desc
  `;
  return toCamelRows<Tournament>(rows);
}

export async function getTournament(id: string) {
  const rows = await sql`
    select
      id,
      name,
      event_date,
      location,
      status,
      is_exhibition,
      qualification_round_count,
      players_per_table,
      finalist_count,
      created_at,
      updated_at
    from tournaments
    where id = ${id}
  `;
  return rows[0] ? toCamelRow<Tournament>(rows[0]) : null;
}

export async function getTournamentSummary(id: string) {
  const [summary] = await sql`
    with participant_count as (
      select count(*)::int as value
      from participants
      where tournament_id = ${id} and status = 'active'
    ),
    community_count as (
      select count(*)::int as value
      from communities
      where tournament_id = ${id}
    ),
    round_count as (
      select count(*)::int as value
      from rounds
      where tournament_id = ${id}
    ),
    table_count as (
      select count(*)::int as value
      from match_tables
      where tournament_id = ${id}
    ),
    submitted_table_count as (
      select count(*)::int as value
      from match_tables
      where tournament_id = ${id} and status in ('submitted','locked')
    )
    select
      participant_count.value as participant_count,
      community_count.value as community_count,
      round_count.value as round_count,
      table_count.value as table_count,
      submitted_table_count.value as submitted_table_count
    from participant_count
    cross join community_count
    cross join round_count
    cross join table_count
    cross join submitted_table_count
  `;
  return toCamelRow<{
    participantCount: number;
    communityCount: number;
    roundCount: number;
    tableCount: number;
    submittedTableCount: number;
  }>(summary);
}

export async function getCommunities(tournamentId: string) {
  const rows = await sql`
    select
      id,
      tournament_id,
      name,
      normalized_name
    from communities
    where tournament_id = ${tournamentId}
    order by name asc
  `;
  return toCamelRows<Community>(rows);
}

export async function getParticipants(tournamentId: string) {
  const rows = await sql`
    select
      p.id,
      p.tournament_id,
      p.community_id,
      p.seed_order,
      p.participant_number,
      p.name,
      p.phone,
      p.status,
      p.created_at,
      p.updated_at,
      c.name as community_name
    from participants p
    left join communities c on c.id = p.community_id
    where p.tournament_id = ${tournamentId}
    order by p.participant_number asc
  `;
  return toCamelRows<Participant>(rows);
}

export async function getRounds(tournamentId: string) {
  const rows = await sql`
    select
      id,
      tournament_id,
      round_number,
      round_type,
      status,
      rotation_penalty,
      rotation_quality,
      rotation_warnings,
      created_at,
      updated_at,
      locked_at
    from rounds
    where tournament_id = ${tournamentId}
    order by case when round_type = 'qualification' then 0 when round_type = 'semifinal' then 1 else 2 end, round_number asc
  `;
  return toCamelRows<Round>(rows);
}

export async function getRound(roundId: string) {
  const rows = await sql`
    select
      id,
      tournament_id,
      round_number,
      round_type,
      status,
      rotation_penalty,
      rotation_quality,
      rotation_warnings,
      created_at,
      updated_at,
      locked_at
    from rounds
    where id = ${roundId}
  `;
  return rows[0] ? toCamelRow<Round>(rows[0]) : null;
}

export async function getTables(roundId: string) {
  const rows = await sql`
    select
      id,
      tournament_id,
      round_id,
      table_number,
      table_name,
      status,
      created_at,
      updated_at,
      submitted_at
    from match_tables
    where round_id = ${roundId}
    order by table_number asc
  `;
  return toCamelRows<MatchTable>(rows);
}

export async function getTable(tableId: string) {
  const rows = await sql`
    select
      id,
      tournament_id,
      round_id,
      table_number,
      table_name,
      status,
      created_at,
      updated_at,
      submitted_at
    from match_tables
    where id = ${tableId}
  `;
  return rows[0] ? toCamelRow<MatchTable>(rows[0]) : null;
}

export async function getTablePlayersByRound(roundId: string) {
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
      p.name as participant_name,
      p.participant_number,
      c.name as community_name
    from table_players tp
    join participants p on p.id = tp.participant_id
    left join communities c on c.id = p.community_id
    where tp.round_id = ${roundId}
    order by tp.table_id, tp.seat_number
  `;
  return toCamelRows<TablePlayer>(rows);
}

export async function getTablePlayersByTable(tableId: string) {
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
      p.name as participant_name,
      p.participant_number,
      c.name as community_name
    from table_players tp
    join participants p on p.id = tp.participant_id
    left join communities c on c.id = p.community_id
    where tp.table_id = ${tableId}
    order by tp.seat_number asc
  `;
  return toCamelRows<TablePlayer>(rows);
}

export async function getScoredQualificationPlayers(tournamentId: string) {
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
      r.round_number,
      p.name as participant_name,
      p.participant_number,
      c.name as community_name
    from table_players tp
    join rounds r on r.id = tp.round_id
    join participants p on p.id = tp.participant_id
    left join communities c on c.id = p.community_id
    where tp.tournament_id = ${tournamentId}
      and r.round_type = 'qualification'
      and r.status = 'locked'
      and tp.score is not null
    order by p.participant_number asc, r.round_number asc
  `;
  return toCamelRows<TablePlayer & { roundNumber: number }>(rows);
}

export async function getPreviousTables(tournamentId: string) {
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
    order by r.round_number asc, mt.table_number asc
  `;

  const grouped = new Map<string, { roundNumber: number; tableNumber: number; players: { id: string; name: string; communityId: string | null }[] }>();
  for (const row of rows) {
    const key = `${row.round_number}-${row.table_number}`;
    const existing =
      grouped.get(key) ??
      {
        roundNumber: Number(row.round_number),
        tableNumber: Number(row.table_number),
        players: [],
      };
    existing.players.push({
      id: String(row.id),
      name: String(row.name),
      communityId: row.community_id ? String(row.community_id) : null,
    });
    grouped.set(key, existing);
  }

  return [...grouped.values()];
}
