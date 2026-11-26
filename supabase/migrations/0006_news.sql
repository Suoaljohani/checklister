-- Staff news feed. Safe to run more than once. Run after 0005_shift_controls.sql.
-- Photos and videos are stored in Supabase Storage (private bucket "news", created by the app);
-- this table only keeps their paths.

create table if not exists public.news (
  id text primary key,
  kind text not null check (kind in ('image', 'video', 'text')),
  caption text not null default '',
  media_path text not null default '',
  poster_path text not null default '',
  width integer not null default 0,
  height integer not null default 0,
  bg text not null default '',
  pinned boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists news_created_idx on public.news (created_at desc);

alter table public.news enable row level security;
revoke all on public.news from anon, authenticated;

-- Let the app's secret-checked functions reach the news table.
create or replace function private.chk_table(p_table text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_table not in ('departments', 'checklists', 'submissions', 'employees', 'news') then
    raise exception 'unknown table %', p_table;
  end if;
  return p_table;
end $$;
