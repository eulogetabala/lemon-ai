-- Allow multiple Facebook Pages per user.
-- Each Page becomes its own user_channels row (unique per page), while other
-- platforms stay unique per connected account.
alter table public.user_channels
  drop constraint if exists user_channels_user_id_channel_type_id_key;

create unique index if not exists user_channels_account_unique
  on public.user_channels (user_id, channel_type_id, provider_account_id);
