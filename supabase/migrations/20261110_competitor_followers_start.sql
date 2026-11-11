-- Follower count recorded at the first sync of each month, so the app can show
-- "nouveaux abonnés du mois" even for the first month a competitor is tracked.
alter table public.competitor_stats
  add column if not exists followers_start bigint;

-- Existing current-month rows: best available baseline is the stored count.
update public.competitor_stats
set followers_start = followers
where followers_start is null and followers > 0;
