drop schema if exists public cascade;
create schema public;
create extension if not exists pgcrypto;

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date null,
  location text null,
  status text not null default 'draft',
  is_exhibition boolean not null default false,
  qualification_round_count integer not null default 4,
  players_per_table integer not null default 5,
  finalist_count integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table communities (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, normalized_name)
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  community_id uuid null references communities(id) on delete set null,
  seed_order integer null,
  participant_number integer not null,
  name text not null,
  phone text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, participant_number)
);

create unique index participants_tournament_seed_order_unique
on participants(tournament_id, seed_order)
where seed_order is not null;

create table rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null,
  round_type text not null,
  status text not null default 'draft',
  rotation_penalty integer null,
  rotation_quality text null,
  rotation_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz null,
  unique (tournament_id, round_type, round_number)
);

create table match_tables (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  table_number integer not null,
  table_name text null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  unique (round_id, table_number)
);

create table table_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  table_id uuid not null references match_tables(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  seat_number integer not null,
  score integer null,
  table_rank integer null,
  tournament_point integer null,
  manual_rank integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, participant_id),
  unique (table_id, seat_number)
);

create table rotation_manual_adjustments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  adjustment_type text not null,
  participant_id_1 uuid not null references participants(id),
  participant_id_2 uuid null references participants(id),
  old_penalty integer null,
  new_penalty integer null,
  note text null,
  created_at timestamptz not null default now()
);

create table finalists (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  qualification_rank integer not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, participant_id)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  round_id uuid null references rounds(id) on delete set null,
  table_id uuid null references match_tables(id) on delete set null,
  action text not null,
  description text not null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index participants_tournament_idx on participants(tournament_id);
create index participants_tournament_community_idx on participants(tournament_id, community_id);
create index communities_tournament_name_idx on communities(tournament_id, name);
create index rounds_tournament_type_number_idx on rounds(tournament_id, round_type, round_number);
create index rounds_tournament_status_idx on rounds(tournament_id, status);
create index match_tables_round_table_idx on match_tables(round_id, table_number);
create index match_tables_tournament_status_idx on match_tables(tournament_id, status);
create index table_players_round_idx on table_players(round_id);
create index table_players_round_table_idx on table_players(round_id, table_id, seat_number);
create index table_players_tournament_idx on table_players(tournament_id);
create index table_players_tournament_participant_idx on table_players(tournament_id, participant_id);
create index table_players_tournament_round_score_idx on table_players(tournament_id, round_id) where score is not null;
create index finalists_tournament_idx on finalists(tournament_id);
