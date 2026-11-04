-- Staff accounts and checklist lock codes. Safe to run more than once.
-- Run after 0003_er_forms.sql.

-- Hash of the code staff must enter to open a checklist ('' = not locked).
alter table public.checklists add column if not exists lock_hash text not null default '';

create table if not exists public.employees (
  id text primary key,
  name text not null,
  name_ar text not null default '',
  employee_no text not null unique,
  job_title text not null default '',
  password_hash text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;
revoke all on public.employees from anon, authenticated;

-- Allow the app's secret-checked functions to reach the new table.
create or replace function private.chk_table(p_table text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_table not in ('departments', 'checklists', 'submissions', 'employees') then
    raise exception 'unknown table %', p_table;
  end if;
  return p_table;
end $$;
