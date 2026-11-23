-- Per-user API quotas and duplicate outreach protection.
-- Apply after 202611070001_initial_schema.sql.

create table if not exists public.api_usage_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('discover', 'contacts', 'reveal')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (user_id, action)
);

alter table public.api_usage_windows enable row level security;
revoke all on public.api_usage_windows from anon, authenticated;

create or replace function public.consume_api_quota(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_started_at timestamptz;
  v_count integer;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_action not in ('discover', 'contacts', 'reveal')
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid quota parameters';
  end if;

  insert into public.api_usage_windows (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, v_now, 1)
  on conflict (user_id, action) do update
    set window_started_at = case
          when public.api_usage_windows.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then v_now else public.api_usage_windows.window_started_at end,
        request_count = case
          when public.api_usage_windows.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then 1 else public.api_usage_windows.request_count + 1 end
  returning public.api_usage_windows.window_started_at, public.api_usage_windows.request_count
  into v_started_at, v_count;

  return query select
    (v_count <= p_limit),
    case when v_count <= p_limit then 0
         else greatest(1, ceil(extract(epoch from (v_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer)
    end;
end;
$$;

revoke all on function public.consume_api_quota(text, integer, integer) from public, anon;
grant execute on function public.consume_api_quota(text, integer, integer) to authenticated;

create table if not exists public.email_send_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  request_fingerprint text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now()
);

alter table public.email_send_attempts enable row level security;
revoke all on public.email_send_attempts from anon;
grant select, insert, update on public.email_send_attempts to authenticated;

drop policy if exists "users manage their own email send attempts" on public.email_send_attempts;
create policy "users manage their own email send attempts"
  on public.email_send_attempts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create unique index if not exists email_send_attempts_active_fingerprint_unique
  on public.email_send_attempts (user_id, request_fingerprint)
  where status in ('pending', 'sent');

create index if not exists email_send_attempts_user_created_idx
  on public.email_send_attempts (user_id, created_at desc);
