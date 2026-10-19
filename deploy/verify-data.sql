\set ON_ERROR_STOP on
set timezone = 'UTC';
select format('select %L as table_name, count(*) as row_count from %I.%I;', tablename, schemaname, tablename)
from pg_tables where schemaname = 'public' order by tablename
\gexec

-- Bandingkan seluruh JSON mentah, versi, link publik, dan waktu penyimpanan v2.
select 'remi_events_v2_checksum' as check_name,
  md5(coalesce(string_agg(
    md5(id::text || ':' || version::text || ':' || data::text || ':' ||
      coalesce(share_token, '') || ':' || coalesce(share_hash, '') || ':' ||
      created_at::text || ':' || updated_at::text), '' order by id), '')) as checksum
from public.remi_events_v2;
