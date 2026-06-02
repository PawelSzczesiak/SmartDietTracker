alter table public.profiles
  add column activity_level text default 'normal',
  add constraint profiles_activity_level_check check (
    activity_level is null or activity_level in ('low', 'normal', 'high')
  );
