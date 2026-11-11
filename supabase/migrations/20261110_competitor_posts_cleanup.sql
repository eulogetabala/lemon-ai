-- Clean competitor posts collected before the 2026-11-10 fixes.
begin;

-- 1. Links that return an HTML page instead of an image (shown as broken images).
update public.competitor_posts
set media_url = null
where media_url like '%lookaside.fbsbx.com%';

-- 2. The same Facebook post stored twice: numeric id + base64 "story" id
--    ("S:_I<pageId>:<postId>"). Keep the numeric row, with the best metrics.
with story as (
  select id, platform_id, likes, comments, shares, content, media_url,
         substring(convert_from(decode(provider_post_id, 'base64'), 'UTF8') from '^S:_I[0-9]+:([0-9]+)') as post_id
  from public.competitor_posts
  where provider_post_id like 'Uzpf%' and length(provider_post_id) % 4 = 0
),
twins as (
  select s.id as story_id, p.id as post_row_id, s.likes, s.comments, s.shares, s.media_url
  from story s
  join public.competitor_posts p
    on p.platform_id = s.platform_id and p.provider_post_id = s.post_id
)
update public.competitor_posts p
set likes = greatest(p.likes, t.likes),
    comments = greatest(p.comments, t.comments),
    shares = greatest(p.shares, t.shares),
    media_url = coalesce(p.media_url, t.media_url)
from twins t
where p.id = t.post_row_id;

delete from public.competitor_posts s
using public.competitor_posts p
where s.provider_post_id like 'Uzpf%' and length(s.provider_post_id) % 4 = 0
  and p.platform_id = s.platform_id
  and p.provider_post_id = substring(convert_from(decode(s.provider_post_id, 'base64'), 'UTF8') from '^S:_I[0-9]+:([0-9]+)');

-- 3. Story-only rows: store them under their post id.
update public.competitor_posts
set provider_post_id = substring(convert_from(decode(provider_post_id, 'base64'), 'UTF8') from '^S:_I[0-9]+:([0-9]+)')
where provider_post_id like 'Uzpf%' and length(provider_post_id) % 4 = 0
  and substring(convert_from(decode(provider_post_id, 'base64'), 'UTF8') from '^S:_I[0-9]+:([0-9]+)') is not null;

commit;
