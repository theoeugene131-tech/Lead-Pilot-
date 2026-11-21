-- LeadPilot AI: initial multi-tenant SaaS foundation.
-- Apply this migration in the Supabase SQL Editor for the LeadPilot project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  domain text,
  contact_name text,
  job_title text,
  email text,
  email_status text,
  source text not null default 'LeadPilot',
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_email_status_check check (
    email_status is null or email_status in ('verified', 'valid', 'accept_all', 'unknown', 'invalid')
  )
);

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);
create index if not exists leads_workspace_id_idx on public.leads(workspace_id);
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- Create a profile and a private starter workspace whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.workspaces (owner_id, name)
  values (new.id, 'My workspace');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
using (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Users can view their own workspaces" on public.workspaces;
create policy "Users can view their own workspaces"
on public.workspaces for select
using (owner_id = (select auth.uid()));

drop policy if exists "Users can create their own workspaces" on public.workspaces;
create policy "Users can create their own workspaces"
on public.workspaces for insert
with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their own workspaces" on public.workspaces;
create policy "Users can update their own workspaces"
on public.workspaces for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their own workspaces" on public.workspaces;
create policy "Users can delete their own workspaces"
on public.workspaces for delete
using (owner_id = (select auth.uid()));

drop policy if exists "Users can view their own leads" on public.leads;
create policy "Users can view their own leads"
on public.leads for select
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can create leads in their own workspaces" on public.leads;
create policy "Users can create leads in their own workspaces"
on public.leads for insert
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can update their own leads" on public.leads;
create policy "Users can update their own leads"
on public.leads for update
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete their own leads" on public.leads;
create policy "Users can delete their own leads"
on public.leads for delete
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
