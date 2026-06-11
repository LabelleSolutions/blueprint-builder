
-- Restrict EXECUTE on the new-user trigger function (called by Postgres via trigger, not by users)
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Add no-op policies for characters/events (service_role bypasses RLS, no user access)
create policy "no public read characters" on public.characters for select using (false);
create policy "no public read events" on public.events for select using (false);
