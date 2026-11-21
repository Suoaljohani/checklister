-- Shift controls. Safe to run more than once. Run after 0004_staff_and_locks.sql.
-- Existing checklists keep working as before: shifts stays null until an admin turns shifts on.

-- Per checklist: [{"code":"M","start":"07:30","end":"10:30"}, ...]. Null = not shift-controlled.
alter table public.checklists add column if not exists shifts jsonb;

-- Per employee: ["M","A"]. Null = all shifts.
alter table public.employees add column if not exists allowed_shifts jsonb;

-- Per record: the shift and its operating date (a 01:00 night check belongs to the date before).
-- Null for older records and for checklists without shifts.
alter table public.submissions add column if not exists shift_code text;
alter table public.submissions add column if not exists shift_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'submissions_shift_code_valid') then
    alter table public.submissions
      add constraint submissions_shift_code_valid check (shift_code is null or shift_code in ('M', 'A', 'N'));
  end if;
end $$;

-- One check per checklist per shift per operating day. Enforced by the database, so two phones
-- submitting at the same moment cannot both succeed.
create unique index if not exists submissions_one_per_shift
  on public.submissions (checklist_id, shift_date, shift_code)
  where shift_code is not null and shift_date is not null;
