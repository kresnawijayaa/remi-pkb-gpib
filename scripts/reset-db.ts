import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const envFile = join(process.cwd(), ".env.local");
const env = readFileSync(envFile, "utf8");
const connectionString =
  process.env.DATABASE_URL ??
  env
    .split(/\r?\n/)
    .find((line) => line.startsWith("DATABASE_URL="))
    ?.replace("DATABASE_URL=", "")
    .replace(/^"|"$/g, "");

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur.");
}

const sql = neon(connectionString);
const schema = readFileSync(join(process.cwd(), "src", "lib", "schema.sql"), "utf8");

async function main() {
  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(`${statement};`);
  }

  console.log("Database Neon berhasil di-reset dan schema baru sudah dibuat.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
