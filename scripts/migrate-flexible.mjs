import nextEnv from "@next/env";
import process from "node:process";
import console from "node:console";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur.");
  const sql = neon(process.env.DATABASE_URL);
  await sql`create table if not exists remi_events_v2 (
    id uuid primary key,
    version integer not null default 1,
    data jsonb not null,
    share_token text null,
    share_hash text unique null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (jsonb_typeof(data) = 'object')
  )`;
  console.log("Tabel REMI baru siap. Tabel turnamen lama tidak diubah.");
}

main().catch(() => { console.error("Migrasi gagal. Periksa koneksi DATABASE_URL dan hak CREATE TABLE."); process.exitCode = 1; });
