-- LeadPilot AI: initial multi-workspace database schema for Supabase.
-- Run this file once in Supabase SQL Editor after creating a project.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  domain text,
  website text,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  job_title text,
  email text,
  email_verification text not null default 'unknown',
  confidence integer check (confidence between 0 and 100),
  seniority text,
  source text not null default 'manual',
  status text not null default 'new' check (status in ('new','qualified','contacted','replied','unsubscribed','do_not_contact')),
  score integer check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_workspace_email_unique
  on public.leads (workspace_id, lower(email)) where email is not null;
create index if not exists leads_workspace_created_idx on public.leads (workspace_id, created_at desc);
create index if not exists companies_workspace_created_idx on public.companies (workspace_id, created_at desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  subject text,
  body text,
  status text not null default 'draft' check (status in ('draft','pending_approval','paused','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  reason text not null default 'unsubscribe',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  event_type text not null check (event_type in ('drafted','approved','sent','delivered','bounced','replied','unsubscribed','failed')),
  provider_event_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists outreach_events_workspace_created_idx on public.outreach_events (workspace_id, created_at desc);

-- Membership check runs with the function owner's privileges to avoid RLS recursion.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = auth.uid()
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.outreach_events enable row level security;

create policy "members can view their workspaces" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "members can view workspace members" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy "members manage companies in their workspace" on public.companies
  for all to authenticated using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "members manage leads in their workspace" on public.leads
  for all to authenticated using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "members manage campaigns in their workspace" on public.campaigns
  for all to authenticated using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "members manage suppressions in their workspace" on public.email_suppressions
  for all to authenticated using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "members view outreach events in their workspace" on public.outreach_events
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add outreach events in their workspace" on public.outreach_events
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- New accounts automatically receive a private workspace and owner membership.
create or replace function public.create_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare new_workspace_id uuid;
begin
  insert into public.workspaces (name, created_by)
  values ('My workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_workspace on auth.users;
create trigger on_auth_user_created_create_workspace
  after insert on auth.users
  for each row execute procedure public.create_default_workspace();

grant execute on function public.is_workspace_member(uuid) to authenticated;
