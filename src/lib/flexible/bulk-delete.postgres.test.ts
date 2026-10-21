import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { bulkDeletionSql } from "./bulk-delete";

test("bulk deletion is atomic, preserves legacy data and unselected events, and rejects stale selections", async () => {
  // Explicit, disposable localhost database only. Never use DATABASE_URL or production credentials.
  const pool = new Pool({ connectionString: "postgresql://postgres:remi-test-only@127.0.0.1:55439/remi_bulk_delete_test" });
  const client = await pool.connect();
  const ids = [1, 2, 3, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
  const request = (indices: number[], version = 1) => JSON.stringify(indices.map(index => ({ id: ids[index], version })));
  try {
    assert.equal((await client.query("select current_database() as name")).rows[0].name, "remi_bulk_delete_test");
    await client.query("begin");
    // Temporary tables shadow real names, even on this throwaway test database.
    await client.query("create temporary table remi_events_v2 (id uuid primary key, version integer not null, data jsonb not null) on commit drop");
    await client.query("create temporary table tournaments (id text primary key) on commit drop");
    await client.query("insert into tournaments values ('legacy-unchanged')");
    for (let index = 0; index < ids.length; index++) {
      await client.query("insert into remi_events_v2 values ($1, 1, $2::jsonb)", [ids[index], JSON.stringify({ parentId: index === 1 ? ids[0] : null })]);
    }
    // Parent without child, stale version, and a mixed existing/missing selection: delete nothing.
    assert.equal((await client.query(bulkDeletionSql, [request([0])])).rowCount, 0);
    assert.equal((await client.query(bulkDeletionSql, [request([2], 2)])).rowCount, 0);
    assert.equal((await client.query(bulkDeletionSql, [JSON.stringify([{ id: ids[2], version: 1 }, { id: "00000000-0000-4000-8000-999999999999", version: 1 }])])).rowCount, 0);
    assert.equal((await client.query("select count(*)::int as count from remi_events_v2")).rows[0].count, 4);
    assert.equal((await client.query(bulkDeletionSql, [request([0, 1])])).rowCount, 2);
    assert.equal((await client.query("select count(*)::int as count from remi_events_v2")).rows[0].count, 2);
    assert.equal((await client.query(bulkDeletionSql, [request([0, 1])])).rowCount, 0);
    assert.equal((await client.query(bulkDeletionSql, [request([2, 3])])).rowCount, 2);
    assert.equal((await client.query("select count(*)::int as count from remi_events_v2")).rows[0].count, 0);
    assert.deepEqual((await client.query("select id from tournaments")).rows, [{ id: "legacy-unchanged" }]);
  } finally {
    await client.query("rollback");
    client.release();
    await pool.end();
  }
});
