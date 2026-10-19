import pg from "pg";
import process from "node:process";
import console from "node:console";

if (process.env.DATABASE_DRIVER !== "postgres" || !process.env.DATABASE_URL) {
  throw new Error("Migrasi VPS memerlukan DATABASE_DRIVER=postgres dan DATABASE_URL.");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
try {
  await client.connect();
  await client.query(`create table if not exists remi_events_v2 (
    id uuid primary key,
    version integer not null default 1,
    data jsonb not null,
    share_token text null,
    share_hash text unique null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (jsonb_typeof(data) = 'object')
  )`);
  console.log("Schema REMI v2 siap; data dan tabel arsip tidak diubah.");
} catch {
  console.error("Migrasi schema gagal. Periksa koneksi dan izin PostgreSQL.");
  process.exitCode = 1;
} finally {
  await client.end();
}
