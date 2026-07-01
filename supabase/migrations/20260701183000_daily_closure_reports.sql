create extension if not exists pgcrypto;

create table if not exists public.daily_closure_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_date date not null,
  leads_nuevos integer not null default 0 check (leads_nuevos >= 0),
  llamadas_realizadas integer not null default 0 check (llamadas_realizadas >= 0),
  llamadas_seguimiento integer not null default 0 check (llamadas_seguimiento >= 0),
  videollamadas_ejecutadas integer not null default 0 check (videollamadas_ejecutadas >= 0),
  videollamadas_agendadas integer not null default 0 check (videollamadas_agendadas >= 0),
  apartados_del_mes integer not null default 0 check (apartados_del_mes >= 0),
  enganches_del_mes integer not null default 0 check (enganches_del_mes >= 0),
  prospectos_calientes integer not null default 0 check (prospectos_calientes >= 0),
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, report_date)
);

create index if not exists daily_closure_reports_report_date_idx
  on public.daily_closure_reports (report_date);

create index if not exists daily_closure_reports_user_id_idx
  on public.daily_closure_reports (user_id);

alter table public.daily_closure_reports enable row level security;

drop policy if exists "advisors_can_select_own_daily_reports" on public.daily_closure_reports;
create policy "advisors_can_select_own_daily_reports"
  on public.daily_closure_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "advisors_can_insert_own_daily_reports" on public.daily_closure_reports;
create policy "advisors_can_insert_own_daily_reports"
  on public.daily_closure_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "managers_can_select_all_daily_reports" on public.daily_closure_reports;
create policy "managers_can_select_all_daily_reports"
  on public.daily_closure_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'gerenta'
    )
  );