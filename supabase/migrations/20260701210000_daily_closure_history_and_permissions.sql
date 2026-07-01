alter table public.daily_closure_reports
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists edit_unlocked_until timestamptz;

create table if not exists public.daily_closure_global_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  team_name text not null default 'VALERIA',
  videollamadas_ejecutadas integer not null default 0 check (videollamadas_ejecutadas >= 0),
  videollamadas_con_presencia integer not null default 0 check (videollamadas_con_presencia >= 0),
  apartados_del_dia integer not null default 0 check (apartados_del_dia >= 0),
  enganches_del_dia integer not null default 0 check (enganches_del_dia >= 0),
  total_llamadas integer not null default 0 check (total_llamadas >= 0),
  videollamadas_agendadas integer not null default 0 check (videollamadas_agendadas >= 0),
  apartados_del_mes integer not null default 0 check (apartados_del_mes >= 0),
  apartados_formalizados integer not null default 0 check (apartados_formalizados >= 0),
  enganches_del_mes integer not null default 0 check (enganches_del_mes >= 0),
  notas text,
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_closure_edit_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_closure_reports (id) on delete cascade,
  report_date date not null,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists daily_closure_edit_requests_report_id_idx
  on public.daily_closure_edit_requests (report_id);

create index if not exists daily_closure_edit_requests_status_idx
  on public.daily_closure_edit_requests (status);

alter table public.daily_closure_global_reports enable row level security;
alter table public.daily_closure_edit_requests enable row level security;

drop policy if exists "advisors_can_update_own_daily_reports" on public.daily_closure_reports;
create policy "advisors_can_update_own_daily_reports"
  on public.daily_closure_reports
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and (
      report_date = current_date
      or (edit_unlocked_until is not null and edit_unlocked_until > timezone('utc', now()))
    )
  )
  with check (
    auth.uid() = user_id
  );

drop policy if exists "managers_can_update_all_daily_reports" on public.daily_closure_reports;
create policy "managers_can_update_all_daily_reports"
  on public.daily_closure_reports
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'gerenta'
    )
  )
  with check (true);

drop policy if exists "advisors_can_select_own_edit_requests" on public.daily_closure_edit_requests;
create policy "advisors_can_select_own_edit_requests"
  on public.daily_closure_edit_requests
  for select
  to authenticated
  using (auth.uid() = requested_by);

drop policy if exists "advisors_can_insert_own_edit_requests" on public.daily_closure_edit_requests;
create policy "advisors_can_insert_own_edit_requests"
  on public.daily_closure_edit_requests
  for insert
  to authenticated
  with check (auth.uid() = requested_by);

drop policy if exists "managers_can_select_all_edit_requests" on public.daily_closure_edit_requests;
create policy "managers_can_select_all_edit_requests"
  on public.daily_closure_edit_requests
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

drop policy if exists "managers_can_update_all_edit_requests" on public.daily_closure_edit_requests;
create policy "managers_can_update_all_edit_requests"
  on public.daily_closure_edit_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'gerenta'
    )
  )
  with check (true);

drop policy if exists "managers_can_select_global_reports" on public.daily_closure_global_reports;
create policy "managers_can_select_global_reports"
  on public.daily_closure_global_reports
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

drop policy if exists "managers_can_insert_global_reports" on public.daily_closure_global_reports;
create policy "managers_can_insert_global_reports"
  on public.daily_closure_global_reports
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'gerenta'
    )
  );

drop policy if exists "managers_can_update_global_reports" on public.daily_closure_global_reports;
create policy "managers_can_update_global_reports"
  on public.daily_closure_global_reports
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'gerenta'
    )
  )
  with check (true);