alter table public.meals
  add column parser_status text not null default 'skipped',
  add column parser_error text,
  add column parser_attempted_at timestamptz;

alter table public.meals
  add constraint meals_parser_status_check
  check (parser_status in ('success', 'failed', 'skipped'));

update public.meals
set
  parser_status = 'success',
  parser_attempted_at = coalesce(updated_at, created_at)
where calories is not null
   or protein is not null
   or carbs is not null
   or fat is not null;

grant update on public.meals to authenticated;

create policy "meals_update_own"
on public.meals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
