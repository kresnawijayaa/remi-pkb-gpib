import { databaseSql } from "../database";
import { createHash } from "node:crypto";
import type { EventData, EventRecord } from "./model";
import { communityName, RuleError, upgradeEventData } from "./model";
import { standingsSnapshot } from "./standings-data";
import { formatPublicCode, validPublicCode } from "./public-code";
import { requireAuth } from "@/lib/auth";
import { requireDeveloperAccess } from "@/lib/developer-access";
import { bulkDeletionSql, type DeletionCandidate } from "./bulk-delete";

function database() {
  if (!process.env.DATABASE_URL) throw new RuleError("DATABASE_URL belum diatur.");
  return databaseSql;
}

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function createPublicShortCode(kind: "schedule" | "standings", createdAt = new Date()) {
  const sql = database();
  for (let offset = 0; offset < 60; offset++) {
    const code = formatPublicCode(new Date(createdAt.getTime() + offset * 1000));
    const rows = kind === "schedule"
      ? await sql`select 1 from remi_events_v2 where data ->> 'drawShareCode' = ${code} limit 1`
      : await sql`select 1 from remi_events_v2 where data ->> 'standingsShareCode' = ${code} limit 1`;
    if (!rows.length) return code;
  }
  throw new RuleError("Belum berhasil membuat shortlink unik. Coba kembali beberapa saat lagi.");
}

export async function getPublicTokenByShortCode(kind: "schedule" | "standings", code: string) {
  if (!validPublicCode(code)) return null;
  const sql = database();
  if (kind === "schedule") {
    const rows = await sql`select share_token from remi_events_v2 where data ->> 'drawShareCode' = ${code} and share_token is not null limit 1`;
    return rows[0]?.share_token ? String(rows[0].share_token) : null;
  }
  const rows = await sql`select data ->> 'standingsShareToken' as token from remi_events_v2 where data ->> 'standingsShareCode' = ${code} limit 1`;
  return rows[0]?.token ? String(rows[0].token) : null;
}

function record(row: Record<string, unknown>): EventRecord {
  return { id: String(row.id), version: Number(row.version), data: upgradeEventData(row.data), shareToken: row.share_token ? String(row.share_token) : null };
}

export async function listEvents() {
  await requireAuth();
  const sql = database();
  const rows = await sql`select id, version, data, share_token from remi_events_v2 order by created_at desc limit 100`;
  return rows.map(record);
}

export async function listDeletionCandidates(): Promise<DeletionCandidate[]> {
  await requireAuth();
  await requireDeveloperAccess();
  const rows = await database().query(`select id, version, data #>> '{settings,name}' as name,
    jsonb_array_length(data -> 'participants') as participants, data ->> 'parentId' as parent_id
    from remi_events_v2 order by created_at desc`);
  return rows.map(row => ({ id: String(row.id), version: Number(row.version), name: String(row.name), participants: Number(row.participants), parentId: row.parent_id ? String(row.parent_id) : null }));
}

export async function deleteEvents(selection: { id: string; version: number }[]) {
  await requireAuth();
  await requireDeveloperAccess();
  if (!selection.length) throw new RuleError("Pilih turnamen terlebih dahulu.");
  const deleted = await database().query(bulkDeletionSql, [JSON.stringify(selection)]);
  if (deleted.length !== selection.length) throw new RuleError("Tidak ada turnamen dihapus. Data mungkin berubah atau memiliki tahap lanjutan yang belum dipilih. Muat ulang, lalu pilih juga seluruh tahap lanjutannya.");
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
  return { name: data.settings.name, participants: data.participants.filter(person => published.has(person.id)).map(person => ({ ...person, community: communityName(data, person) })), draws, shortCode: data.drawShareCode };
}

export async function getSharedStandings(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const sql = database();
  const rows = await sql`select data, updated_at from remi_events_v2 where data ->> 'standingsShareHash' = ${tokenHash(token)}`;
  if (!rows[0]) return null;
  const data = upgradeEventData(rows[0].data);
  const updatedAt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "medium" }).format(new Date(String(rows[0].updated_at)));
  return { ...standingsSnapshot(data, `${updatedAt} WIB`), shortCode: data.standingsShareCode };
}
