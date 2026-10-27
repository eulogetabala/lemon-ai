create extension if not exists "uuid-ossp";

create table if not exists public.channel_types (
  id uuid primary key default uuid_generate_v4(),
  type text not null unique,
  name text not null,
  color text not null,
  character_limit integer not null default 2200,
  created_at timestamptz default now()
);

insert into public.channel_types (type, name, color, character_limit)
values
  ('TWITTER', 'Twitter / X', '#000000', 280),
  ('LINKEDIN', 'LinkedIn', '#2867b2', 3000),
  ('INSTAGRAM', 'Instagram', '#E4405F', 2200),
  ('THREADS', 'Threads', '#000000', 500),
  ('FACEBOOK', 'Facebook', '#1877F2', 63206),
  ('BLUESKY', 'Bluesky', '#1285fe', 300),
  ('YOUTUBE', 'YouTube', '#FF0000', 100),
  ('TIKTOK', 'Tiktok', '#000000', 100)
on conflict (type) do nothing;

create table if not exists public.user_channels (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  channel_type_id uuid not null references public.channel_types(id) on delete restrict,
  provider_account_id text,
  handle text,
  profile_image text,
  profile_url text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, channel_type_id)
);

create table if not exists public.idea_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into public.idea_groups (name)
values
  ('Unassigned'),
  ('To Do'),
  ('In Progress'),
  ('Done')
on conflict (name) do nothing;

create table if not exists public.ideas (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  group_id uuid not null references public.idea_groups(id) on delete restrict,
  title text not null,
  description text,
  images jsonb default '[]',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scheduled_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  user_channel_id uuid references public.user_channels(id) on delete cascade,
  content text not null,
  images jsonb default '[]',
  scheduled_at timestamptz not null,
  status text not null default 'draft',
  publish_status text not null default 'pending',
  visibility_status text not null default 'unknown',
  provider_owner_type text,
  provider_owner_id text,
  provider_response jsonb default '{}'::jsonb,
  published_at timestamptz,
  published_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scheduled_posts
  drop constraint if exists scheduled_posts_status_check;

alter table public.scheduled_posts
  add constraint scheduled_posts_status_check
  check (status in ('queue', 'draft', 'published', 'failed'));

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

alter table public.channel_types enable row level security;
alter table public.user_channels enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_groups enable row level security;
alter table public.scheduled_posts enable row level security;
