grant delete on public.meals to authenticated;

create policy "meals_delete_own"
on public.meals
for delete
to authenticated
using ((select auth.uid()) = user_id);
