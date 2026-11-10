-- ============================================================
-- Workspaces, team membership, invitations, Sebpay payments
-- ============================================================

create extension if not exists "pgcrypto";

-- ── workspaces ─────────────────────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,
  name        text not null,
  slug        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

-- ── workspace_members ──────────────────────────────────────
create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       text not null,
  role          text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);

-- ── workspace_invitations ──────────────────────────────────
create table if not exists public.workspace_invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  email         text not null,
  role          text not null check (role in ('admin', 'editor', 'viewer')),
  token         text not null unique,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by    text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);

create index if not exists workspace_invitations_email_idx on public.workspace_invitations (lower(email));
create index if not exists workspace_invitations_workspace_id_idx on public.workspace_invitations (workspace_id);

-- ── payments (Sebpay audit) ────────────────────────────────
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null,
  plan_id               text not null,
  interval              text not null check (interval in ('monthly', 'yearly')),
  amount_fcfa           integer not null,
  currency              text not null default 'XOF',
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected', 'expired')),
  external_reference    text not null unique,
  checkout_session_id   text,
  transaction_id        text,
  metadata              jsonb default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  paid_at               timestamptz
);

create index if not exists payments_user_id_idx on public.payments (user_id);

-- ── Add workspace_id columns ───────────────────────────────
alter table public.user_channels
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.scheduled_posts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.idea_groups
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.ideas
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table if exists public.competitors
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- ── Backfill: one "Principal" workspace per distinct user ──
insert into public.workspaces (owner_id, name, slug)
select distinct u.user_id, 'Principal', 'principal'
from (
  select user_id from public.user_channels
  union
  select user_id from public.scheduled_posts
  union
  select user_id from public.idea_groups
  union
  select user_id from public.ideas
) u
where u.user_id is not null
  and not exists (
    select 1 from public.workspaces w
    where w.owner_id = u.user_id and w.slug = 'principal'
  );

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
where w.owner_id = uc.user_id
  and w.slug = 'principal'
  and uc.workspace_id is null;

update public.scheduled_posts sp
set workspace_id = w.id
from public.workspaces w
where w.owner_id = sp.user_id
  and w.slug = 'principal'
  and sp.workspace_id is null;

update public.idea_groups ig
set workspace_id = w.id
from public.workspaces w
where w.owner_id = ig.user_id
  and w.slug = 'principal'
  and ig.workspace_id is null;

update public.ideas i
set workspace_id = w.id
from public.workspaces w
where w.owner_id = i.user_id
  and w.slug = 'principal'
  and i.workspace_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'competitors'
  ) then
    execute $sql$
      update public.competitors c
      set workspace_id = w.id
      from public.workspaces w
      where w.owner_id = c.user_id
        and w.slug = 'principal'
        and c.workspace_id is null
    $sql$;
  end if;
end $$;

create index if not exists user_channels_workspace_id_idx on public.user_channels (workspace_id);
create index if not exists scheduled_posts_workspace_id_idx on public.scheduled_posts (workspace_id);
create index if not exists idea_groups_workspace_id_idx on public.idea_groups (workspace_id);
create index if not exists ideas_workspace_id_idx on public.ideas (workspace_id);

-- Note: we keep workspace_id nullable for gradual rollout safety.
-- Application code always sets it on create and scopes reads by membership.
