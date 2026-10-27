create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_channel_id uuid not null,
  content text not null,
  images jsonb default '[]',
  scheduled_at timestamptz not null,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scheduled_posts
  add column if not exists publish_status text not null default 'pending',
  add column if not exists visibility_status text not null default 'unknown',
  add column if not exists provider_owner_type text,
  add column if not exists provider_owner_id text,
  add column if not exists provider_response jsonb default '{}'::jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists published_url text,
  add column if not exists error_message text;

alter table public.scheduled_posts
  drop constraint if exists scheduled_posts_publish_status_check;

alter table public.scheduled_posts
  add constraint scheduled_posts_publish_status_check
  check (publish_status in ('pending', 'published', 'failed', 'partial'));

alter table public.scheduled_posts
  drop constraint if exists scheduled_posts_visibility_status_check;

alter table public.scheduled_posts
  add constraint scheduled_posts_visibility_status_check
  check (visibility_status in ('unknown', 'visible', 'hidden'));

alter table public.scheduled_posts
  drop constraint if exists scheduled_posts_status_check;

alter table public.scheduled_posts
  add constraint scheduled_posts_status_check
  check (status in ('queue', 'draft', 'published', 'failed'));
