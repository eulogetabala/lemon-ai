-- ============================================================
-- RLS policies for workspace tables (Clerk JWT: auth.jwt() ->> 'sub').
-- Without them, any request made with the per-user client got
-- "new row violates row-level security policy for table workspaces".
-- The server also uses the service-role client for these tables, so
-- this migration is defence in depth, not a hard requirement.
-- ============================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.payments enable row level security;

-- workspaces: owner has full access, members can read
drop policy if exists workspaces_owner_all on public.workspaces;
create policy workspaces_owner_all on public.workspaces
  for all
  using (owner_id = (auth.jwt() ->> 'sub'))
  with check (owner_id = (auth.jwt() ->> 'sub'));

drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces
  for select
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspaces.id
      and m.user_id = (auth.jwt() ->> 'sub')
  ));

-- workspace_members: a user sees/manages their own membership rows;
-- the workspace owner manages all rows of their workspace
drop policy if exists workspace_members_self on public.workspace_members;
create policy workspace_members_self on public.workspace_members
  for select
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists workspace_members_owner_all on public.workspace_members;
create policy workspace_members_owner_all on public.workspace_members
  for all
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (auth.jwt() ->> 'sub')
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (auth.jwt() ->> 'sub')
  ));

-- workspace_invitations: workspace owner only (invite acceptance uses service role)
drop policy if exists workspace_invitations_owner_all on public.workspace_invitations;
create policy workspace_invitations_owner_all on public.workspace_invitations
  for all
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_invitations.workspace_id
      and w.owner_id = (auth.jwt() ->> 'sub')
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_invitations.workspace_id
      and w.owner_id = (auth.jwt() ->> 'sub')
  ));

-- payments: read-only for the paying user (writes go through service role)
drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments
  for select
  using (user_id = (auth.jwt() ->> 'sub'));

-- Re-attach rows that were saved without a workspace to the owner's Principal workspace
insert into public.workspaces (owner_id, name, slug)
select distinct uc.user_id, 'Principal', 'principal'
from public.user_channels uc
where uc.workspace_id is null
  and not exists (select 1 from public.workspaces w where w.owner_id = uc.user_id and w.slug = 'principal');

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w
where not exists (
  select 1 from public.workspace_members m
  where m.workspace_id = w.id and m.user_id = w.owner_id
);

update public.user_channels uc
set workspace_id = w.id
from public.workspaces w
where w.owner_id = uc.user_id and w.slug = 'principal' and uc.workspace_id is null;
