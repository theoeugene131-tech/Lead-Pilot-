-- Per-user, persistent API quotas for paid provider operations.
-- The function uses the authenticated Supabase user and updates each counter atomically.
create table if not exists public.api_usage_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('discover','contacts','reveal')),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action)
);

alter table public.api_usage_windows enable row level security;
revoke all on public.api_usage_windows from anon, authenticated;

create or replace function public.consume_api_quota(
  p_action text,
  p_limit integer,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  quota_allowed boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_action not in ('discover','contacts','reveal')
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid quota parameters';
  end if;

  insert into public.api_usage_windows (user_id, action, window_started_at, request_count)
  values (current_user_id, p_action, now(), 1)
  on conflict (user_id, action) do update
    set window_started_at = case
          when public.api_usage_windows.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now()
          else public.api_usage_windows.window_started_at
        end,
        request_count = case
          when public.api_usage_windows.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1
          else public.api_usage_windows.request_count + 1
        end
    where public.api_usage_windows.window_started_at <= now() - make_interval(secs => p_window_seconds)
       or public.api_usage_windows.request_count < p_limit
  returning true into quota_allowed;

  return coalesce(quota_allowed, false);
end;
$$;

revoke all on function public.consume_api_quota(text, integer, integer) from public, anon;
grant execute on function public.consume_api_quota(text, integer, integer) to authenticated;
