import { z } from "zod";
import { RuleError } from "./model";

export type DeletionCandidate = { id: string; version: number; name: string; participants: number; parentId: string | null };

export function parseDeletionRequest(selection: string, confirmation: unknown) {
  if (confirmation !== "HAPUS") throw new RuleError("Ketik HAPUS untuk mengonfirmasi penghapusan permanen.");
  let raw: unknown;
  try { raw = JSON.parse(selection); } catch { throw new RuleError("Pilihan turnamen tidak valid. Muat ulang halaman."); }
  const parsed = z.array(z.object({ id: z.string().uuid(), version: z.number().int().positive() }).strict()).min(1).max(1000).safeParse(raw);
  if (!parsed.success || new Set(parsed.data.map(item => item.id)).size !== parsed.data.length) throw new RuleError("Pilih 1–1000 turnamen berbeda yang ingin dihapus.");
  return parsed.data;
}

// One statement: stale/missing selections or unselected children cancel the whole batch.
// Only the v2 table is addressed; legacy tournament tables are never touched.
export const bulkDeletionSql = `
  with requested as (
    select * from jsonb_to_recordset($1::jsonb) as item(id uuid, version integer)
  ), selected as materialized (
    select event.id from remi_events_v2 event
    join requested on requested.id = event.id and requested.version = event.version
    for update of event
  )
  delete from remi_events_v2 event using selected
  where event.id = selected.id
    and (select count(*) from selected) = (select count(*) from requested)
    and not exists (
      select 1 from remi_events_v2 child
      where child.data ->> 'parentId' in (select id::text from selected)
        and child.id not in (select id from selected)
    )
  returning event.id
`;
