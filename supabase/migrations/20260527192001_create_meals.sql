create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_text text not null,
  consumed_at timestamptz not null default timezone('utc', now()),
  calories integer,
  protein numeric(6, 2),
  carbs numeric(6, 2),
  fat numeric(6, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meals_meal_text_check check (char_length(btrim(meal_text)) > 0),
  constraint meals_calories_check check (calories is null or calories >= 0),
  constraint meals_protein_check check (protein is null or protein >= 0),
  constraint meals_carbs_check check (carbs is null or carbs >= 0),
  constraint meals_fat_check check (fat is null or fat >= 0)
);

create index meals_user_consumed_at_idx
on public.meals (user_id, consumed_at desc);

create trigger set_meals_updated_at
before update on public.meals
for each row
execute function public.set_updated_at();

alter table public.meals enable row level security;

grant select, insert on public.meals to authenticated;

create policy "meals_select_own"
on public.meals
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "meals_insert_own"
on public.meals
for insert
to authenticated
with check ((select auth.uid()) = user_id);
