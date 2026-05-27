create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age integer,
  sex text,
  current_weight numeric(6, 2),
  height numeric(6, 2),
  target_weight numeric(6, 2),
  manual_daily_calorie_limit integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_age_check check (age is null or (age >= 0 and age <= 150)),
  constraint profiles_sex_check check (
    sex is null or sex in ('male', 'female', 'other', 'prefer_not_to_say')
  ),
  constraint profiles_current_weight_check check (current_weight is null or current_weight > 0),
  constraint profiles_height_check check (height is null or height > 0),
  constraint profiles_target_weight_check check (target_weight is null or target_weight > 0),
  constraint profiles_manual_daily_calorie_limit_check check (
    manual_daily_calorie_limit is null or manual_daily_calorie_limit > 0
  )
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
