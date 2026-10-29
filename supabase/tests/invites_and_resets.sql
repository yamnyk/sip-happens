-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: invite revoke (links_delete policy), reset_requests.resolved_at trigger and column lock.
-- Success: the script finishes with the notice 'invites_and_resets: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 admin, 02 regular, 03 other regular.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d7000000-0000-0000-0000-000000000001', 'd7-admin@sip.invalid', '{"nick":"tst-inv-admin"}'),
  ('d7000000-0000-0000-0000-000000000002', 'd7-user@sip.invalid', '{"nick":"tst-inv-user"}'),
  ('d7000000-0000-0000-0000-000000000003', 'd7-other@sip.invalid', '{"nick":"tst-inv-other"}');
update public.profiles set is_admin = true where id = 'd7000000-0000-0000-0000-000000000001';

-- Links of user 02: 01 unused, 02 used, 03 expired, 04 unused (for a foreign delete attempt), 05 unused (banned case).
-- Link 06: reset link created by the admin for user 02.
insert into public.links (token, kind, created_by, used_by, used_at, expires_at) values
  ('d7000000-0000-0000-0004-000000000001', 'invite', 'd7000000-0000-0000-0000-000000000002', null, null, now() + interval '7 days'),
  ('d7000000-0000-0000-0004-000000000002', 'invite', 'd7000000-0000-0000-0000-000000000002', 'd7000000-0000-0000-0000-000000000003', now(), now() + interval '7 days'),
  ('d7000000-0000-0000-0004-000000000003', 'invite', 'd7000000-0000-0000-0000-000000000002', null, null, now() - interval '1 day'),
  ('d7000000-0000-0000-0004-000000000004', 'invite', 'd7000000-0000-0000-0000-000000000003', null, null, now() + interval '7 days'),
  ('d7000000-0000-0000-0004-000000000005', 'invite', 'd7000000-0000-0000-0000-000000000003', null, null, now() + interval '7 days');
insert into public.links (token, kind, created_by, target_user_id) values
  ('d7000000-0000-0000-0004-000000000006', 'reset', 'd7000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000002');

insert into public.reset_requests (id, nick, inviter_nick, user_id) values
  ('d7000000-0000-0000-0006-000000000001', 'tst-inv-user', 'someone', 'd7000000-0000-0000-0000-000000000002'),
  ('d7000000-0000-0000-0006-000000000002', 'tst-inv-other', 'someone', 'd7000000-0000-0000-0000-000000000003');

-- ---------------------------------------------------------------------------
-- Regular user: revoke own invites
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d7000000-0000-0000-0000-000000000002');

do $$
declare
  n int;
begin
  delete from public.links where token = 'd7000000-0000-0000-0004-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'a used invite must NOT be revocable';

  delete from public.links where token = 'd7000000-0000-0000-0004-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'an expired invite must NOT be revocable';

  delete from public.links where token = 'd7000000-0000-0000-0004-000000000004';
  get diagnostics n = row_count;
  assert n = 0, 'another user''s invite must NOT be revocable';

  delete from public.links where token = 'd7000000-0000-0000-0004-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'the creator must be able to revoke their own unused, unexpired invite';
  assert not exists (select 1 from public.links where token = 'd7000000-0000-0000-0004-000000000001'),
    'a revoked invite must be gone';

  -- Reset links are never client-deletable by their target (not their creator, and not an invite).
  delete from public.links where token = 'd7000000-0000-0000-0004-000000000006';
  get diagnostics n = row_count;
  assert n = 0, 'a reset link must NOT be deletable by the target user';

  -- resolved_at is no longer client-writable, and reset_requests stay invisible and untouchable.
  assert (select count(*) from public.reset_requests) = 0, 'regular user must see no reset_requests';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Admin: own reset link is not revocable through the invite policy, resolved_at is trigger-owned
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d7000000-0000-0000-0000-000000000001');

do $$
declare
  n int;
  denied boolean;
  r timestamptz;
begin
  delete from public.links where token = 'd7000000-0000-0000-0004-000000000006';
  get diagnostics n = row_count;
  assert n = 0, 'even an admin must NOT delete a reset link through the invite revoke policy';

  delete from public.links where token = 'd7000000-0000-0000-0004-000000000004';
  get diagnostics n = row_count;
  assert n = 0, 'an admin must NOT revoke another user''s invite';

  -- resolved_at is not writable by the client any more
  denied := false;
  begin
    update public.reset_requests set resolved_at = now() - interval '10 days'
      where id = 'd7000000-0000-0000-0006-000000000001';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT update reset_requests.resolved_at';

  -- resolving by resolved_by stamps resolved_at with database time
  update public.reset_requests set resolved_by = 'd7000000-0000-0000-0000-000000000001'
    where id = 'd7000000-0000-0000-0006-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to resolve a reset request';
  select resolved_at into r from public.reset_requests where id = 'd7000000-0000-0000-0006-000000000001';
  assert r is not null and r >= now() - interval '1 minute' and r <= now() + interval '1 minute',
    'resolved_at must be set by the trigger when resolved_by is set';

  -- un-resolving clears it again
  update public.reset_requests set resolved_by = null where id = 'd7000000-0000-0000-0006-000000000001';
  assert (select resolved_at from public.reset_requests where id = 'd7000000-0000-0000-0006-000000000001') is null,
    'resolved_at must be cleared when resolved_by is cleared';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Disabled user cannot revoke; deleting a resolver keeps resolved_at
-- ---------------------------------------------------------------------------
update public.profiles set disabled = true where id = 'd7000000-0000-0000-0000-000000000003';
set local role authenticated;
select public.tst_as('d7000000-0000-0000-0000-000000000003');

do $$
declare
  n int;
begin
  delete from public.links where token = 'd7000000-0000-0000-0004-000000000005';
  get diagnostics n = row_count;
  assert n = 0, 'a disabled user must NOT revoke invites';
end $$;

reset role;

do $$
begin
  -- resolve request 02 by the admin (as the editor role), then delete the admin profile's reference
  update public.reset_requests set resolved_by = 'd7000000-0000-0000-0000-000000000001'
    where id = 'd7000000-0000-0000-0006-000000000002';
  assert (select resolved_at from public.reset_requests where id = 'd7000000-0000-0000-0006-000000000002') is not null,
    'resolved_at must be set for a request resolved by the editor role';
  delete from auth.users where id = 'd7000000-0000-0000-0000-000000000001';
  assert (select resolved_by from public.reset_requests where id = 'd7000000-0000-0000-0006-000000000002') is null,
    'resolved_by must be nulled when the resolver is deleted';
  assert (select resolved_at from public.reset_requests where id = 'd7000000-0000-0000-0006-000000000002') is not null,
    'resolved_at must survive the resolver being deleted';
  raise notice 'invites_and_resets: all assertions passed';
end $$;

rollback;
