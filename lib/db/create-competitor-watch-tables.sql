-- ============================================================
-- Lemon AI — Competitor Watch (Veille concurrentielle)
-- Real, database-backed competitor tracking. No mock data.
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- REQUESTING_USER_ID FUNCTION (idempotent, matches create-social-scheduling-tables.sql)
create or replace function public.requesting_user_id()
returns text
language sql stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text
$$;

-- ── competitors ─────────────────────────────────────────────
-- One row per tracked brand / competitor page.
create table if not exists competitors (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,               -- Clerk user ID (JWT sub)
  name         text not null,
  industry     text,
  website      text,
  verified     boolean not null default false,
  connected_at timestamptz not null default now(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── competitor_platforms ────────────────────────────────────
-- One row per (competitor, social platform). Linked to the
-- user's connected account (user_channels) when available so
-- the sync can read the real OAuth token and fetch real data.
create table if not exists competitor_platforms (
  id                  uuid primary key default gen_random_uuid(),
  competitor_id       uuid not null references competitors(id) on delete cascade,
  user_channel_id     uuid references user_channels(id) on delete set null,
  platform            text not null,        -- twitter | instagram | facebook | linkedin | tiktok | ...
  handle              text,
  profile_url         text,
  profile_image       text,
  provider_account_id text,
  followers           bigint not null default 0,
  connected_at        timestamptz not null default now(),
  synced_at           timestamptz,
  last_error          text,
  unique (competitor_id, platform)
);

-- ── competitor_stats ────────────────────────────────────────
-- Monthly snapshot per platform. One row per (platform, month).
-- Only real values returned by the provider API are stored here.
create table if not exists competitor_stats (
  id             uuid primary key default gen_random_uuid(),
  platform_id    uuid not null references competitor_platforms(id) on delete cascade,
  month          text not null,             -- "YYYY-MM" (e.g. "2026-10")
  impressions     bigint not null default 0,
  likes           bigint not null default 0,
  comments        bigint not null default 0,
  shares          bigint not null default 0,
  posts           integer not null default 0,
  followers       bigint not null default 0,
  engagement_rate numeric(8,4) not null default 0,
  synced_at       timestamptz default now(),
  unique (platform_id, month)
);

-- ── competitor_posts ────────────────────────────────────────
-- Real posts fetched from the provider, deduplicated by provider id.
create table if not exists competitor_posts (
  id              uuid primary key default gen_random_uuid(),
  platform_id     uuid not null references competitor_platforms(id) on delete cascade,
  provider_post_id text,
  content         text,
  media_url       text,
  published_at    timestamptz not null,
  likes           integer not null default 0,
  comments        integer not null default 0,
  shares          integer not null default 0,
  views           integer not null default 0,
  engagement_rate numeric(8,4) not null default 0,
  synced_at       timestamptz default now(),
  unique (platform_id, provider_post_id)
);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists competitors_user_idx             on competitors(user_id);
create index if not exists competitor_platforms_competitor_idx on competitor_platforms(competitor_id);
create index if not exists competitor_stats_platform_month_idx on competitor_stats(platform_id, month desc);
create index if not exists competitor_posts_platform_date_idx  on competitor_posts(platform_id, published_at desc);

-- ── Row Level Security ─────────────────────────────────────
alter table competitors          enable row level security;
alter table competitor_platforms enable row level security;
alter table competitor_stats     enable row level security;
alter table competitor_posts     enable row level security;

drop policy if exists competitors_own on competitors;
create policy competitors_own on competitors
  for all
  using (user_id = requesting_user_id())
  with check (user_id = requesting_user_id());

drop policy if exists competitor_platforms_own on competitor_platforms;
create policy competitor_platforms_own on competitor_platforms
  for all
  using (
    exists (
      select 1 from competitors c
      where c.id = competitor_platforms.competitor_id
        and c.user_id = requesting_user_id()
    )
  )
  with check (
    exists (
      select 1 from competitors c
      where c.id = competitor_platforms.competitor_id
        and c.user_id = requesting_user_id()
    )
  );

drop policy if exists competitor_stats_own on competitor_stats;
create policy competitor_stats_own on competitor_stats
  for all
  using (
    exists (
      select 1
      from competitor_platforms p
      join competitors c on c.id = p.competitor_id
      where p.id = competitor_stats.platform_id
        and c.user_id = requesting_user_id()
    )
  )
  with check (
    exists (
      select 1
      from competitor_platforms p
      join competitors c on c.id = p.competitor_id
      where p.id = competitor_stats.platform_id
        and c.user_id = requesting_user_id()
    )
  );

drop policy if exists competitor_posts_own on competitor_posts;
create policy competitor_posts_own on competitor_posts
  for all
  using (
    exists (
      select 1
      from competitor_platforms p
      join competitors c on c.id = p.competitor_id
      where p.id = competitor_posts.platform_id
        and c.user_id = requesting_user_id()
    )
  )
  with check (
    exists (
      select 1
      from competitor_platforms p
      join competitors c on c.id = p.competitor_id
      where p.id = competitor_posts.platform_id
        and c.user_id = requesting_user_id()
    )
  );
