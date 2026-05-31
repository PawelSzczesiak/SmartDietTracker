alter table public.meals
  drop constraint if exists meals_meal_text_check;

alter table public.meals
  add constraint meals_meal_text_check
  check (
    char_length(btrim(meal_text)) > 0
    and char_length(meal_text) <= 2000
  );
