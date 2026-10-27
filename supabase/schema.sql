-- ============================================================
-- Lemon AI — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── Enable UUID extension ─────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── channel_types ─────────────────────────────────────────
-- Static list of supported social networks (seeded below)
create table if not exists channel_types (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null unique,      -- e.g. "twitter", "instagram"
  name          text not null,             -- e.g. "X (Twitter)"
  color         text,                      -- e.g. "#1DA1F2"
  character_limit int,
  created_at    timestamptz default now()
);

-- ── user_channels ─────────────────────────────────────────
-- Each row = one social account connected by a user
create table if not exists user_channels (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             text not null,          -- Clerk userId (sub claim)
  channel_type_id     uuid references channel_types(id) on delete cascade,
  provider_account_id text,                   -- external account id (e.g. Google user id)
  handle              text,
  profile_image       text,
  profile_url         text,
  access_token        text,                   -- encrypted by app layer
  refresh_token       text,
  token_expires_at    timestamptz,
  is_connected        boolean default false,
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  -- One row per connected account; Facebook users can connect several Pages
  -- (each Page has its own provider_account_id).
  unique (user_id, channel_type_id, provider_account_id)
);

-- ── scheduled_posts ───────────────────────────────────────
create table if not exists scheduled_posts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         text not null,
  user_channel_id uuid references user_channels(id) on delete cascade,
  content         text not null,
  images          jsonb default '[]',
  scheduled_at    timestamptz not null,
  status          text not null default 'draft', -- draft | queue | published | failed
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── idea_groups ───────────────────────────────────────────
create table if not exists idea_groups (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- ── ideas ─────────────────────────────────────────────────
create table if not exists ideas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  group_id    uuid references idea_groups(id) on delete cascade,
  title       text not null,
  description text,
  images      jsonb default '[]',
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table user_channels   enable row level security;
alter table scheduled_posts enable row level security;
alter table idea_groups      enable row level security;
alter table ideas            enable row level security;

-- user_channels policies
create policy "Users manage own channels" on user_channels
  for all using ( user_id = (auth.jwt() ->> 'sub') );

-- scheduled_posts policies
create policy "Users manage own posts" on scheduled_posts
  for all using ( user_id = (auth.jwt() ->> 'sub') );

-- idea_groups policies
create policy "Users manage own groups" on idea_groups
  for all using ( user_id = (auth.jwt() ->> 'sub') );

-- ideas policies
create policy "Users manage own ideas" on ideas
  for all using ( user_id = (auth.jwt() ->> 'sub') );

-- channel_types is public read-only (no auth needed)
alter table channel_types enable row level security;
create policy "Anyone can read channel types" on channel_types
  for select using (true);

-- ============================================================
-- Seed channel_types
-- ============================================================
insert into channel_types (type, name, color, character_limit) values
  ('twitter',   'X (Twitter)',  '#000000', 280),
  ('linkedin',  'LinkedIn',     '#0A66C2', 3000),
  ('instagram', 'Instagram',    '#E1306C', 2200),
  ('facebook',  'Facebook',     '#1877F2', 63206),
  ('threads',   'Threads',      '#101010', 500),
  ('youtube',   'YouTube',      '#FF0000', 5000),
  ('tiktok',    'TikTok',       '#010101', 2200)
on conflict (type) do nothing;

-- ============================================================
-- Storage bucket for images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lemon', 'lemon', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users upload own images" on storage.objects
  for insert with check (
    bucket_id = 'lemon'
    and (storage.foldername(name))[1] = 'images'
    and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
  );

create policy "Public read images" on storage.objects
  for select using ( bucket_id = 'lemon' );
