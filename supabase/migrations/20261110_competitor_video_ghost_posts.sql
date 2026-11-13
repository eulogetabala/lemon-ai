-- The public Facebook scraper used to treat a story's video node (it has an id
-- and a creation_time too) as a post of its own. Those rows carry the fallback
-- text "Publication officielle", no engagement, and duplicate the real post's
-- image. The scraper now only keeps nodes with a post_id; drop the leftovers.
delete from public.competitor_posts cp
using public.competitor_platforms pl
where pl.id = cp.platform_id
  and pl.platform = 'facebook'
  and cp.content = 'Publication officielle'
  and coalesce(cp.likes, 0) = 0
  and coalesce(cp.comments, 0) = 0
  and coalesce(cp.shares, 0) = 0;
