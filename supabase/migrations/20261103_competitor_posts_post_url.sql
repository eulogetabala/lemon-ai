-- competitor_posts.post_url: permalink to the original post.
-- Databases created before this column existed are missing it, which made the
-- competitor sync silently drop every fetched post (PGRST204 on upsert).
alter table if exists competitor_posts
  add column if not exists post_url text;
