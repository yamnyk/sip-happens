-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: what an admin can do that a regular user cannot (links, reset_requests, other users' drinks),
-- what even an admin cannot do (profiles writes, forged ownership), and a disabled admin losing all power.
-- Success: the script finishes with the notice 'admin_paths: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 admin, 02 regular, 03 disabled admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d5000000-0000-0000-0000-000000000001', 'd5-admin@sip.invalid', '{"nick":"tst-adm-admin"}'),
  ('d5000000-0000-0000-0000-000000000002', 'd5-user@sip.invalid', '{"nick":"tst-adm-user"}'),
  ('d5000000-0000-0000-0000-000000000003', 'd5-exadmin@sip.invalid', '{"nick":"tst-adm-exadmin"}');
update public.profiles set is_admin = true where id in
  ('d5000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000003');
update public.profiles set disabled = true where id = 'd5000000-0000-0000-0000-000000000003';

insert into public.drinks (id, name, type, created_by) values
  ('d5000000-0000-0000-0001-000000000001', 'zz tst adm drink', 'red', 'd5000000-0000-0000-0000-000000000002');
insert into public.links (token, kind, created_by) values
  ('d5000000-0000-0000-0004-000000000001', 'invite', 'd5000000-0000-0000-0000-000000000002'),
  ('d5000000-0000-0000-0004-000000000002', 'invite', 'd5000000-0000-0000-0000-000000000001');
insert into public.reset_requests (id, nick, inviter_nick, user_id) values
  ('d5000000-0000-0000-0006-000000000001', 'tst-adm-user', 'someone', 'd5000000-0000-0000-0000-000000000002'),
  ('d5000000-0000-0000-0006-000000000002', 'tst-adm-other', 'someone', null);

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d5000000-0000-0000-0000-000000000001');

do $$
declare
  a constant uuid := 'd5000000-0000-0000-0000-000000000001';
  u constant uuid := 'd5000000-0000-0000-0000-000000000002';
  denied boolean;
  n int;
begin
  assert (select public.is_admin()) and (select public.is_active()), 'admin must be admin and active';

  -- links: reads everyone's, may create reset links, still cannot forge ownership
  assert (select count(*) from public.links where created_by in (a, u)) = 2, 'admin must read every link';

  insert into public.links (kind, target_user_id) values ('reset', u);
  assert exists (select 1 from public.links where kind = 'reset' and target_user_id = u and created_by = a),
    'admin must be able to create a reset link';

  denied := false;
  begin
    insert into public.links (kind, created_by) values ('invite', u);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'admin must NOT set links.created_by';

  denied := false;
  begin
    insert into public.links (kind) values ('reset');
  exception when check_violation then denied := true;
  end;
  assert denied, 'a reset link without target must be rejected';

  denied := false;
  begin
    insert into public.links (kind, target_user_id) values ('invite', u);
  exception when check_violation then denied := true;
  end;
  assert denied, 'an invite link with a target must be rejected';

  -- reset_requests: admin reads and resolves, resolved_by may only be self
  assert (select count(*) from public.reset_requests where nick in ('tst-adm-user', 'tst-adm-other')) = 2,
    'admin must read reset_requests';

  update public.reset_requests set resolved_at = now(), resolved_by = a
    where id = 'd5000000-0000-0000-0006-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to resolve a reset request as self';

  denied := false;
  begin
    update public.reset_requests set resolved_at = now(), resolved_by = u
      where id = 'd5000000-0000-0000-0006-000000000002';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'resolved_by must be null or the admin themself';

  denied := false;
  begin
    update public.reset_requests set nick = 'edited' where id = 'd5000000-0000-0000-0006-000000000002';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'admin must NOT edit reset_requests.nick';

  denied := false;
  begin
    delete from public.reset_requests where id = 'd5000000-0000-0000-0006-000000000002';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'nobody but service_role may delete reset_requests';

  -- profiles stay read-only even for admins
  denied := false;
  begin
    update public.profiles set is_admin = false where id = a;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'admin must NOT write profiles from the client';

  -- another user's drink
  update public.drinks set name = 'zz tst adm drink edited' where id = 'd5000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to edit another user''s drink';
end $$;

-- ---------------------------------------------------------------------------
-- Regular user: none of the above
-- ---------------------------------------------------------------------------
select public.tst_as('d5000000-0000-0000-0000-000000000002');

do $$
declare
  n int;
begin
  assert not (select public.is_admin()), 'regular user must not be admin';
  assert (select count(*) from public.links where created_by = 'd5000000-0000-0000-0000-000000000002') = 1,
    'regular user must read own links';
  assert not exists (select 1 from public.links where created_by = 'd5000000-0000-0000-0000-000000000001'),
    'regular user must NOT read the admin''s links';
  assert (select count(*) from public.reset_requests) = 0, 'regular user must see no reset_requests';

  update public.reset_requests set resolved_at = now() where id = 'd5000000-0000-0000-0006-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'regular user must NOT resolve reset requests';
end $$;

-- ---------------------------------------------------------------------------
-- Disabled admin: is_admin() is false, every admin path is closed
-- ---------------------------------------------------------------------------
select public.tst_as('d5000000-0000-0000-0000-000000000003');

do $$
declare
  denied boolean := false;
  n int;
begin
  assert not (select public.is_admin()), 'a disabled admin must not count as admin';
  assert not (select public.is_active()), 'a disabled user must not be active';
  assert (select count(*) from public.reset_requests) = 0, 'a disabled admin must see no reset_requests';
  assert not exists (select 1 from public.links), 'a disabled admin must see no links of others';

  begin
    insert into public.links (kind, target_user_id) values ('reset', 'd5000000-0000-0000-0000-000000000002');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'a disabled admin must NOT create reset links';

  update public.drinks set name = 'zz tst adm by exadmin' where id = 'd5000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'a disabled admin must NOT edit drinks';

  delete from public.drinks where id = 'd5000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'a disabled admin must NOT delete drinks';
end $$;

reset role;

do $$
begin
  raise notice 'admin_paths: all assertions passed';
end $$;

rollback;
