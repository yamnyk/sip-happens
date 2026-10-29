-- 0005: invite revoke by creator, reset_requests.resolved_at set by the database.
-- Idempotent: safe to re-run in the SQL editor.

-- ---------------------------------------------------------------------------
-- Invite revoke: the creator may delete their own unused, unexpired invite link.
-- Narrow on purpose: invites only (never reset links), never used or expired rows,
-- and the creator must still be an active user.
-- ---------------------------------------------------------------------------

grant delete on public.links to authenticated;

drop policy if exists links_delete on public.links;
create policy links_delete on public.links for delete to authenticated
  using (
    created_by = (select auth.uid())
    and kind = 'invite'
    and used_at is null
    and expires_at > now()
    and (select public.is_active())
  );

-- ---------------------------------------------------------------------------
-- reset_requests.resolved_at is owned by the database.
-- Resolving = setting resolved_by. The trigger stamps resolved_at with database time.
-- Un-resolving (resolved_by back to null by an explicit update) clears it. When resolved_by is
-- nulled by the on delete set null of a deleted admin profile, resolved_at is kept.
-- Updates that do not change resolved_by (service_role, SQL editor) leave resolved_at as written.
-- ---------------------------------------------------------------------------

create or replace function public.set_reset_request_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resolved_by is not null and old.resolved_by is null then
    new.resolved_at := now();
  elsif new.resolved_by is not null then
    new.resolved_at := coalesce(old.resolved_at, now());
  elsif old.resolved_by is not null
        and exists (select 1 from public.profiles p where p.id = old.resolved_by) then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.set_reset_request_resolved_at() from public, anon, authenticated;

drop trigger if exists reset_requests_set_resolved_at on public.reset_requests;
create trigger reset_requests_set_resolved_at
  before update on public.reset_requests
  for each row
  when (new.resolved_by is distinct from old.resolved_by)
  execute function public.set_reset_request_resolved_at();

-- Keeps the existing grant on resolved_by exactly; only resolved_at loses its client write.
revoke update (resolved_at) on public.reset_requests from authenticated;
