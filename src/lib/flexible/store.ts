import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import type { EventData, EventRecord } from "./model";
import { communityName, RuleError, upgradeEventData } from "./model";
import { requireAuth } from "@/lib/auth";

function database() {
  if (!process.env.DATABASE_URL) throw new RuleError("DATABASE_URL belum diatur.");
  return neon(process.env.DATABASE_URL);
}

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

function record(row: Record<string, unknown>): EventRecord {
  return { id: String(row.id), version: Number(row.version), data: upgradeEventData(row.data), shareToken: row.share_token ? String(row.share_token) : null };
}

export async function listEvents() {
  await requireAuth();
  const sql = database();
  const rows = await sql`select id, version, data, share_token from remi_events_v2 order by created_at desc limit 100`;
  return rows.map(record);
}

export async function getEvent(id: string) {
  await requireAuth();
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const sql = database();
  const rows = await sql`select id, version, data, share_token from remi_events_v2 where id = ${id}`;
  return rows[0] ? record(rows[0]) : null;
}

export async function createEvent(id: string, data: EventData) {
  const sql = database();
  await sql`insert into remi_events_v2 (id, data) values (${id}, ${JSON.stringify(data)}::jsonb) on conflict (id) do nothing`;
}

export async function saveEvent(event: EventRecord) {
  const sql = database();
  const rows = await sql`update remi_events_v2 set data = ${JSON.stringify(event.data)}::jsonb, version = version + 1, share_token = ${event.shareToken}, share_hash = ${event.shareToken ? tokenHash(event.shareToken) : null}, updated_at = now() where id = ${event.id} and version = ${event.version} returning id`;
  if (!rows.length) throw new RuleError("Data sudah berubah di perangkat lain. Muat ulang halaman sebelum mencoba lagi.");
}

export async function getSharedEvent(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const sql = database();
  const rows = await sql`select data from remi_events_v2 where share_hash = ${tokenHash(token)}`;
  if (!rows[0]) return null;
  const data = upgradeEventData(rows[0].data);
  const draws = data.draws.filter(draw => draw.locked);
  const published = new Set(draws.flatMap(draw => draw.tables.flat()));
  return { name: data.settings.name, participants: data.participants.filter(person => published.has(person.id)).map(person => ({ ...person, community: communityName(data, person) })), draws };
}
