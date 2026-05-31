alter table public.profiles
  add column target_pace text,
  add constraint profiles_target_pace_check check (
    target_pace is null or target_pace in ('slow', 'normal', 'fast')
  );
