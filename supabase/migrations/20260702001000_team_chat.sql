create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete cascade,
  is_global boolean not null default false,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint team_messages_scope_check check (
    (is_global = true and recipient_id is null) or
    (is_global = false and recipient_id is not null)
  )
);

create index if not exists team_messages_created_at_idx
  on public.team_messages (created_at desc);

create index if not exists team_messages_recipient_id_idx
  on public.team_messages (recipient_id);

create table if not exists public.team_message_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_type text not null check (conversation_type in ('global', 'direct')),
  peer_user_id uuid references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  unique (user_id, conversation_type, peer_user_id)
);

create index if not exists team_message_reads_user_id_idx
  on public.team_message_reads (user_id);

alter table public.team_messages enable row level security;
alter table public.team_message_reads enable row level security;

drop policy if exists "team_members_can_select_messages" on public.team_messages;
create policy "team_members_can_select_messages"
  on public.team_messages
  for select
  to authenticated
  using (
    is_global = true
    or sender_id = auth.uid()
    or recipient_id = auth.uid()
  );

drop policy if exists "team_members_can_insert_messages" on public.team_messages;
create policy "team_members_can_insert_messages"
  on public.team_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (is_global = true and recipient_id is null)
      or (is_global = false and recipient_id is not null)
    )
  );

drop policy if exists "users_can_select_own_message_reads" on public.team_message_reads;
create policy "users_can_select_own_message_reads"
  on public.team_message_reads
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_can_insert_own_message_reads" on public.team_message_reads;
create policy "users_can_insert_own_message_reads"
  on public.team_message_reads
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users_can_update_own_message_reads" on public.team_message_reads;
create policy "users_can_update_own_message_reads"
  on public.team_message_reads
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
