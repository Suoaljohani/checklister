-- checklistER: full database setup. Paste this whole file into Supabase → SQL Editor → Run.


create table if not exists public.departments (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text not null default '',
  icon text not null default 'Building2',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checklists (
  id text primary key,
  department_id text not null references public.departments(id) on delete cascade,
  title_en text not null,
  title_ar text not null default '',
  icon text not null default 'ClipboardCheck',
  color text not null default '#1691D0',
  fields jsonb not null default '[]'::jsonb,
  range_note text not null default '',
  footer_note text not null default '',
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists checklists_department_idx on public.checklists (department_id);

create table if not exists public.submissions (
  id text primary key,
  checklist_id text not null references public.checklists(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  employee_name text not null,
  employee_no text not null default '',
  submitted_at timestamptz not null default now(),
  "values" jsonb not null default '{}'::jsonb,
  signature text not null default '',
  flagged boolean not null default false,
  note text not null default ''
);
create index if not exists submissions_checklist_time_idx on public.submissions (checklist_id, submitted_at desc);
create index if not exists submissions_department_time_idx on public.submissions (department_id, submitted_at desc);
create index if not exists submissions_time_idx on public.submissions (submitted_at desc);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

alter table public.departments enable row level security;
alter table public.checklists enable row level security;
alter table public.submissions enable row level security;
alter table public.settings enable row level security;

insert into public.departments (id, slug, name_en, name_ar, icon, sort)
values ('dep-er', 'er', 'Emergency Room', 'قسم الطوارئ', 'Siren', 1)
on conflict (id) do nothing;

insert into public.checklists (id, department_id, title_en, title_ar, icon, color, fields, range_note, footer_note, orientation, sort)
values
  ('chk-stock-room', 'dep-er',
   'Daily Temperature and Humidity Check for Stock Room',
   'التحقق اليومي من درجة الحرارة والرطوبة لغرفة المستودع',
   'Package', '#1691D0',
   '[{"key":"temperature","label_en":"Temperature","label_ar":"درجة الحرارة","type":"number","unit":"°C","min":22,"max":25,"required":true},
     {"key":"humidity","label_en":"Humidity","label_ar":"الرطوبة","type":"number","unit":"%","min":0,"max":70,"required":true}]',
   'NORMAL RANGE: TEMPERATURE RANGES FROM 22°C TO 25°C / RELATIVE HUMIDITY UP TO 70%',
   'Infection Prevention and Control Department', 'portrait', 1),
  ('chk-refrigerator', 'dep-er',
   'Daily Temperature Check for Refrigerator',
   'جدول تشييك على درجة حرارة الثلاجة',
   'Refrigerator', '#3AC0C3',
   '[{"key":"temperature","label_en":"Temperature","label_ar":"الحرارة","type":"number","unit":"°C","min":2,"max":8,"required":true}]',
   'NORMAL RANGE: 2°C TO 8°C',
   'Infection Prevention and Control Department', 'landscape', 2)
on conflict (id) do nothing;


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
