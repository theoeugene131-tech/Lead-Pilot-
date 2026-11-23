-- Phase 2: store each user's complete CRM workspace snapshot in Supabase.
-- The existing UI's nested company/contact structure is preserved without lossy column mapping.
create table if not exists public.crm_snapshots (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crm_snapshots enable row level security;

drop policy if exists "members manage CRM snapshots in their workspace" on public.crm_snapshots;
create policy "members manage CRM snapshots in their workspace"
  on public.crm_snapshots
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create index if not exists crm_snapshots_updated_idx
  on public.crm_snapshots (updated_at desc);
