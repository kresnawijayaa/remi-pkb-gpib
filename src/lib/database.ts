import { neon } from "@neondatabase/serverless";
import { Pool, types } from "pg";

type DatabaseRow = Record<string, unknown>;
const databaseGlobal = globalThis as typeof globalThis & { remiPostgresPool?: Pool };

function postgresPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur.");
  if (!databaseGlobal.remiPostgresPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      allowExitOnIdle: true,
      // Samakan hasil date/timestamp dengan driver Neon; jangan mengubah waktu arsip.
      types: {
        getTypeParser: (oid, format) => [1082, 1114, 1184].includes(oid)
          ? (value: string) => value
          : types.getTypeParser(oid, format),
      },
    });
    pool.on("error", () => console.error("Koneksi PostgreSQL idle terputus; koneksi baru akan dibuat saat diperlukan."));
    databaseGlobal.remiPostgresPool = pool;
  }
  return databaseGlobal.remiPostgresPool;
}

async function query(text: string, values: unknown[] = []): Promise<DatabaseRow[]> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur.");
  const driver = process.env.DATABASE_DRIVER ?? "neon";
  if (driver === "neon") return neon(process.env.DATABASE_URL).query(text, values);
  if (driver !== "postgres") throw new Error("DATABASE_DRIVER harus neon atau postgres.");
  const result = await postgresPool().query<DatabaseRow>(text, values);
  return result.rows;
}

async function taggedQuery(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((statement, part, index) => statement + (index ? `$${index}` : "") + part, "");
  return query(text, values);
}

// Kedua driver menggunakan parameter terpisah; nilai input tidak disisipkan ke SQL.
export const databaseSql = Object.assign(taggedQuery, { query });
