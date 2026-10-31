-- ER Checklists schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- The app talks to the database only from the server with the service-role key,
-- so RLS is enabled with no public policies: the anon key can read nothing.

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

-- Starter data: ER department and the two paper forms.
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
