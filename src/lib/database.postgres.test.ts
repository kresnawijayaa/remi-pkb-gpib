import assert from "node:assert/strict";
import test from "node:test";
import { databaseSql as sql } from "./database";

test("driver PostgreSQL menjaga parameter, JSON, timestamp, dan optimistic locking", async () => {
  assert.equal(process.env.DATABASE_DRIVER, "postgres");
  const [database] = await sql`select current_database() as name`;
  // Pengujian tulis hanya di database lokal yang dibuat khusus untuk test.
  assert.equal(database.name, "remi_migration_check");
  await sql`create table if not exists remi_driver_test (
    id text primary key, version integer not null, data jsonb not null,
    created_at timestamptz not null default now()
  )`;
  const id = `test-${crypto.randomUUID()}`;
  const input = { name: "O'Brien; DROP TABLE remi_driver_test; --", points: -10, publicToken: "tetap-sama" };
  try {
    await sql`insert into remi_driver_test (id, version, data) values (${id}, ${1}, ${JSON.stringify(input)}::jsonb)`;
    const [stored] = await sql.query("select * from remi_driver_test where id = $1", [id]);
    assert.deepEqual(stored.data, input);
    assert.equal(stored.version, 1);
    assert.equal(typeof stored.created_at, "string");
    assert.ok(Number.isFinite(new Date(String(stored.created_at)).getTime()));
    const updated = await sql`update remi_driver_test set version = version + 1 where id = ${id} and version = ${1} returning id`;
    assert.equal(updated.length, 1);
    const stale = await sql`update remi_driver_test set version = version + 1 where id = ${id} and version = ${1} returning id`;
    assert.equal(stale.length, 0);
  } finally {
    await sql`delete from remi_driver_test where id = ${id}`;
  }
});
