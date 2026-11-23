-- Prevent repeated sends of the same outreach message by the same user.
-- A pending attempt remains blocked after a timeout because provider acceptance may be uncertain.
create table if not exists public.email_send_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  request_fingerprint text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique (user_id, request_fingerprint)
);

alter table public.email_send_attempts enable row level security;
revoke all on public.email_send_attempts from anon;
grant select, insert, update on public.email_send_attempts to authenticated;

drop policy if exists "users manage their own email send attempts" on public.email_send_attempts;
create policy "users manage their own email send attempts"
  on public.email_send_attempts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists email_send_attempts_created_idx
  on public.email_send_attempts (user_id, created_at desc);
