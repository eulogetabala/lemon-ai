-- ============================================================
-- Purge competitor-watch data that was invented by the sync code
-- (hard-coded Canal+ / DreamWork / BCH posts, generated LinkedIn posts,
-- placeholder captions, fixed follower counts). Real data is re-fetched
-- by the next sync from official sources only.
-- ============================================================

begin;

-- 1. Invented posts
delete from public.competitor_posts
where provider_post_id like 'canalpluscongo-fb-post-%'
   or provider_post_id like 'li-%'
   or provider_post_id like 'ph-%'
   or provider_post_id in (
     'UzpfSTEwMDA2NDkwODg1MzA5OToxMjYzNjA3NDEyNDc5NTQy',
     'UzpfSTEwMDA4NTQ2MTA0MTEyMzoxMTE3MzYyNzgzNDE2MzU',
     'UzpfSTEwMDA4NTQ2MTA0MTEyMzoxMTk0MTk1NDQyMzk5NzU',
     'UzpfSTEwMDA4NTQ2MTA0MTEyMzoxMjA1NjI4NDQxMjU2NDU',
     'UzpfSTEwMDAwMjQwNDYzMTYxMjoyNDUyMTkyNDA0MDgwNDQxMA==',
     '1325407302921303',
     '365878875046295',
     '645139784281395'
   )
   or content in ('Publication officielle')
   or content like 'Communication officielle Banque Congolaise de l''Habitat — Note d''information%'
   or content like 'Avis à la clientèle — Banque Congolaise de l''Habitat%';

-- 2. Remaining scraped posts carry fabricated views (interactions × 15)
update public.competitor_posts set views = 0 where views > 0;

-- 3. Hard-coded follower counts (Canal+ 327 000, DreamWork 882, LinkedIn 1 850 / 1 200)
update public.competitor_platforms
set followers = 0, last_error = null
where platform = 'linkedin'
   or (platform = 'facebook' and (handle ilike '%canal%' or handle ilike '%dreamwork%'));

-- 4. Monthly snapshots are rebuilt from the remaining real posts at next sync
delete from public.competitor_stats
where platform_id in (select id from public.competitor_platforms where followers = 0)
   or platform_id in (
     select cp.id from public.competitor_platforms cp
     where not exists (select 1 from public.competitor_posts p where p.platform_id = cp.id)
   );
update public.competitor_stats set impressions = 0;

commit;
