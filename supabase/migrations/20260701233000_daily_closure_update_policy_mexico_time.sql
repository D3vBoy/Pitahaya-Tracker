drop policy if exists "advisors_can_update_own_daily_reports" on public.daily_closure_reports;

create policy "advisors_can_update_own_daily_reports"
  on public.daily_closure_reports
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and (
      report_date = (timezone('America/Mexico_City', now()))::date
      or (edit_unlocked_until is not null and edit_unlocked_until > timezone('utc', now()))
    )
  )
  with check (
    auth.uid() = user_id
  );
