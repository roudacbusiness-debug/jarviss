-- RLS : chaque ligne n'est visible et modifiable que par son propriétaire
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'subjects', 'events', 'evaluations', 'tasks',
    'documents', 'event_documents', 'ical_feeds', 'ical_events', 'timetable_slots'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete', t);
  end loop;
end $$;
