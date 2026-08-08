-- Ended trainer/client links must not retain cross-user read/write authority.

drop policy if exists "trainer reads client workouts" on public.workouts;
create policy "trainer reads client workouts" on public.workouts
  for select using (
    public.has_permission('view_client_history')
    and exists (
      select 1 from public.trainer_clients tc
       where tc.trainer_id = auth.uid()
         and tc.client_id = workouts.user_id
         and tc.status = 'active'
    )
  );

-- Relationship creation and reactivation are mediated by invitation RPCs.  A
-- trainer may read their own roster but cannot silently revive an ended link.
drop policy if exists "trainer manages clients" on public.trainer_clients;
