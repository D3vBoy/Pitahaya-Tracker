drop policy if exists "team_members_can_select_messages" on public.team_messages;

create policy "team_members_can_select_messages"
  on public.team_messages
  for select
  to authenticated
  using (
    is_global = true
    or sender_id = auth.uid()
    or recipient_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role, '')) in ('gerenta', 'gerente', 'manager', 'admin', 'direccion')
    )
  );