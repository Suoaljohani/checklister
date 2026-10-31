-- Server-only API. The app calls these functions with the public key plus a
-- server secret (CHK_DB_SECRET). Tables are not reachable with the public key.
-- The last statement stores the SHA-256 hash of CHK_DB_SECRET (the secret itself is never stored).
-- If you rotate the secret, update that hash.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);

revoke all on public.departments, public.checklists, public.submissions, public.settings from anon, authenticated;

create or replace function private.chk_auth(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
     (select value from private.app_config where key = 'secret_sha256') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end $$;

create or replace function private.chk_table(p_table text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_table not in ('departments', 'checklists', 'submissions') then
    raise exception 'unknown table %', p_table;
  end if;
  return p_table;
end $$;

create or replace function public.chk_list(p_secret text, p_table text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := private.chk_table(p_table);
  r jsonb;
begin
  perform private.chk_auth(p_secret);
  execute format(
    'select coalesce(jsonb_agg(to_jsonb(x.*) order by %s), ''[]''::jsonb) from public.%I x',
    case when t = 'submissions' then 'x.submitted_at desc' else 'x.sort, x.created_at' end, t)
  into r;
  return r;
end $$;

create or replace function public.chk_get(p_secret text, p_table text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := private.chk_table(p_table);
  r jsonb;
begin
  perform private.chk_auth(p_secret);
  execute format('select to_jsonb(x.*) from public.%I x where x.id = $1', t) into r using p_id;
  return r;
end $$;

create or replace function public.chk_insert(p_secret text, p_table text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := private.chk_table(p_table);
  r jsonb;
begin
  perform private.chk_auth(p_secret);
  execute format(
    'insert into public.%1$I select * from jsonb_populate_record(null::public.%1$I, $1) returning to_jsonb(%1$I.*)', t)
  into r using p_row;
  return r;
end $$;

create or replace function public.chk_update(p_secret text, p_table text, p_id text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := private.chk_table(p_table);
  sets text;
  r jsonb;
begin
  perform private.chk_auth(p_secret);
  select string_agg(format('%1$I = (jsonb_populate_record(null::public.%2$I, $2)).%1$I', k, t), ', ')
  into sets
  from jsonb_object_keys(p_patch) k
  where k <> 'id'
    and k in (select column_name from information_schema.columns where table_schema = 'public' and table_name = t);
  if sets is null then
    return public.chk_get(p_secret, p_table, p_id);
  end if;
  execute format('update public.%I x set %s where x.id = $1 returning to_jsonb(x.*)', t, sets)
  into r using p_id, p_patch;
  return r;
end $$;

create or replace function public.chk_delete(p_secret text, p_table text, p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := private.chk_table(p_table);
begin
  perform private.chk_auth(p_secret);
  execute format('delete from public.%I where id = $1', t) using p_id;
end $$;

create or replace function public.chk_submissions(p_secret text, p_filter jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  with_sig boolean := coalesce((p_filter ->> 'withSignature')::boolean, false);
begin
  perform private.chk_auth(p_secret);
  select coalesce(jsonb_agg(
           case when with_sig then to_jsonb(s.*) else (to_jsonb(s.*) - 'signature') || '{"signature":""}'::jsonb end
           order by s.submitted_at desc), '[]'::jsonb)
  into r
  from (
    select * from public.submissions x
    where (p_filter ->> 'checklist_id' is null or x.checklist_id = p_filter ->> 'checklist_id')
      and (p_filter ->> 'department_id' is null or x.department_id = p_filter ->> 'department_id')
      and (p_filter ->> 'from' is null or x.submitted_at >= (p_filter ->> 'from')::timestamptz)
      and (p_filter ->> 'to' is null or x.submitted_at < (p_filter ->> 'to')::timestamptz)
    order by x.submitted_at desc
    limit coalesce((p_filter ->> 'limit')::int, 5000)
  ) s;
  return r;
end $$;

create or replace function public.chk_count(p_secret text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.chk_auth(p_secret);
  return (select count(*) from public.submissions);
end $$;

create or replace function public.chk_settings_get(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.chk_auth(p_secret);
  return (select value from public.settings where key = 'app');
end $$;

create or replace function public.chk_settings_put(p_secret text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.chk_auth(p_secret);
  insert into public.settings (key, value) values ('app', p_value)
  on conflict (key) do update set value = excluded.value;
end $$;

revoke all on function private.chk_auth(text) from public, anon, authenticated;

insert into private.app_config (key, value)
values ('secret_sha256', 'aadf760285a07c39ea6bb67f406835a6376455aa4ea01f9e9d446ccb992acdca')
on conflict (key) do update set value = excluded.value;
