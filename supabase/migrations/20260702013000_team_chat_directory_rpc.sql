create or replace function public.get_team_chat_directory()
returns table (
  id uuid,
  full_name text,
  role text
)
language sql
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.full_name,
    profiles.role
  from public.profiles
  where lower(coalesce(profiles.role, '')) in ('asesor', 'gerenta', 'gerente', 'manager', 'admin', 'direccion');
$$;

revoke all on function public.get_team_chat_directory() from public;
grant execute on function public.get_team_chat_directory() to authenticated;