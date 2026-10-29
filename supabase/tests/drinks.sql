-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: drinks column privileges, RLS for creator / other user / admin / banned user,
-- table checks, guard_drink_type and drinks_other_needs_subtype.
-- Success: the script finishes with the notice 'drinks: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 creator, 02 other active user, 03 admin, 04 banned (disabled).
insert into auth.users (id, email, raw_user_meta_data) values
  ('d1000000-0000-0000-0000-000000000001', 'd1-creator@sip.invalid', '{"nick":"tst-drk-creator"}'),
  ('d1000000-0000-0000-0000-000000000002', 'd1-other@sip.invalid', '{"nick":"tst-drk-other"}'),
  ('d1000000-0000-0000-0000-000000000003', 'd1-admin@sip.invalid', '{"nick":"tst-drk-admin"}'),
  ('d1000000-0000-0000-0000-000000000004', 'd1-banned@sip.invalid', '{"nick":"tst-drk-banned"}');
update public.profiles set is_admin = true where id = 'd1000000-0000-0000-0000-000000000003';
update public.profiles set disabled = true where id = 'd1000000-0000-0000-0000-000000000004';

insert into public.drink_subtypes (id, name, created_by) values
  ('d1000000-0000-0000-0002-000000000001', 'zz tst drk spirit', 'd1000000-0000-0000-0000-000000000001');

-- 01 free, 02 locked by another user's review, 03 reviewed only by its creator, 04 owned by the banned user.
insert into public.drinks (id, name, type, created_by) values
  ('d1000000-0000-0000-0001-000000000001', 'zz tst drk one', 'red', 'd1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0001-000000000002', 'zz tst drk two', 'red', 'd1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0001-000000000003', 'zz tst drk three', 'red', 'd1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0001-000000000004', 'zz tst drk four', 'white', 'd1000000-0000-0000-0000-000000000004');
insert into public.reviews (drink_id, author_id, first_scores) values
  ('d1000000-0000-0000-0001-000000000002', 'd1000000-0000-0000-0000-000000000002', '{"a":1,"b":2,"c":3,"d":4}'),
  ('d1000000-0000-0000-0001-000000000003', 'd1000000-0000-0000-0000-000000000001', '{"a":1,"b":2,"c":3,"d":4}');

-- ---------------------------------------------------------------------------
-- Creator (active, non-admin)
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d1000000-0000-0000-0000-000000000001');

do $$
declare
  c1 constant uuid := 'd1000000-0000-0000-0000-000000000001';
  c2 constant uuid := 'd1000000-0000-0000-0000-000000000002';
  d1 constant uuid := 'd1000000-0000-0000-0001-000000000001';
  d2 constant uuid := 'd1000000-0000-0000-0001-000000000002';
  d3 constant uuid := 'd1000000-0000-0000-0001-000000000003';
  d4 constant uuid := 'd1000000-0000-0000-0001-000000000004';
  s1 constant uuid := 'd1000000-0000-0000-0002-000000000001';
  denied boolean;
  n int;
  o_id uuid;
begin
  -- insert: created_by defaults to the caller
  insert into public.drinks (name, type) values ('zz tst drk new', 'white');
  assert (select created_by from public.drinks where name = 'zz tst drk new') = c1,
    'drinks.created_by must default to the caller';

  denied := false;
  begin
    insert into public.drinks (name, type, created_by) values ('zz tst drk forged', 'red', c2);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to set drinks.created_by';

  -- table checks
  denied := false;
  begin
    insert into public.drinks (name, type) values ('   ', 'red');
  exception when check_violation then denied := true;
  end;
  assert denied, 'blank drink name must be rejected';

  denied := false;
  begin
    insert into public.drinks (name, type) values (repeat('x', 81), 'red');
  exception when check_violation then denied := true;
  end;
  assert denied, 'drink name over 80 chars must be rejected';

  denied := false;
  begin
    insert into public.drinks (name, type) values ('zz tst drk beer', 'beer');
  exception when check_violation then denied := true;
  end;
  assert denied, 'unknown drink type must be rejected';

  denied := false;
  begin
    insert into public.drinks (name, type) values ('  ZZ TST DRK ONE ', 'red');
  exception when unique_violation then denied := true;
  end;
  assert denied, 'drink names must be unique after trim and lowercase';

  -- drinks_other_needs_subtype and drinks_subtype_only_other
  denied := false;
  begin
    insert into public.drinks (name, type) values ('zz tst drk other bare', 'other');
  exception when check_violation then denied := true;
  end;
  assert denied, 'type other without subtype must be rejected';

  denied := false;
  begin
    insert into public.drinks (name, type, subtype_id) values ('zz tst drk red sub', 'red', s1);
  exception when check_violation then denied := true;
  end;
  assert denied, 'a subtype on a non-other drink must be rejected';

  insert into public.drinks (name, type, subtype_id) values ('zz tst drk other ok', 'other', s1);
  select id into o_id from public.drinks where name = 'zz tst drk other ok';

  denied := false;
  begin
    update public.drinks set subtype_id = null where id = o_id;
  exception when check_violation then denied := true;
  end;
  assert denied, 'clearing the subtype of an other drink must be rejected';

  denied := false;
  begin
    update public.drinks set type = 'red' where id = o_id;
  exception when check_violation then denied := true;
  end;
  assert denied, 'changing other to red while the subtype is set must be rejected';

  update public.drinks set type = 'red', subtype_id = null where id = o_id;
  get diagnostics n = row_count;
  assert n = 1, 'creator must be able to move an unreviewed other drink to a wine type';

  -- update own drink: rename and same-group type change
  update public.drinks set name = 'zz tst drk one renamed' where id = d1;
  get diagnostics n = row_count;
  assert n = 1, 'creator must be able to rename an unreviewed drink';

  update public.drinks set type = 'white' where id = d1;
  get diagnostics n = row_count;
  assert n = 1, 'type change inside the wine group must be allowed';

  denied := false;
  begin
    update public.drinks set created_by = c2 where id = d1;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to update drinks.created_by';

  -- reviewed by someone else: creator is locked out (silent no-op)
  update public.drinks set name = 'zz tst drk hijack' where id = d2;
  get diagnostics n = row_count;
  assert n = 0, 'creator must NOT rename a drink reviewed by another user';

  delete from public.drinks where id = d2;
  get diagnostics n = row_count;
  assert n = 0, 'creator must NOT delete a drink reviewed by another user';
  assert exists (select 1 from public.drinks where id = d2 and name = 'zz tst drk two'), 'locked drink must be unchanged';

  -- guard_drink_type: own review does not lock policy, but blocks cross-group type change
  denied := false;
  begin
    update public.drinks set type = 'gin' where id = d3;
  exception when check_violation then denied := true;
  end;
  assert denied, 'guard_drink_type must block a cross-group change once reviewed';

  update public.drinks set type = 'sparkling' where id = d3;
  get diagnostics n = row_count;
  assert n = 1, 'guard_drink_type must allow a same-group change when reviewed';

  -- someone else's drink (banned user's): silent no-op
  update public.drinks set name = 'zz tst drk stolen' where id = d4;
  get diagnostics n = row_count;
  assert n = 0, 'user must NOT update a drink created by someone else';

  delete from public.drinks where id = d4;
  get diagnostics n = row_count;
  assert n = 0, 'user must NOT delete a drink created by someone else';

  -- delete own unreviewed drink
  delete from public.drinks where name = 'zz tst drk new';
  get diagnostics n = row_count;
  assert n = 1, 'creator must be able to delete an unreviewed drink';
end $$;

-- ---------------------------------------------------------------------------
-- Other active user
-- ---------------------------------------------------------------------------
select public.tst_as('d1000000-0000-0000-0000-000000000002');

do $$
declare
  n int;
begin
  update public.drinks set name = 'zz tst drk hijack' where id = 'd1000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'non-creator must NOT update a drink';

  delete from public.drinks where id = 'd1000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'non-creator must NOT delete a drink';

  assert exists (select 1 from public.drinks where name = 'zz tst drk one renamed'), 'every signed-in user must read drinks';

  insert into public.drinks (name, type) values ('zz tst drk by two', 'gin');
  assert exists (select 1 from public.drinks where name = 'zz tst drk by two'), 'any active user must be able to add a drink';
end $$;

-- ---------------------------------------------------------------------------
-- Banned user (profiles.disabled = true): reads work, every write is blocked
-- ---------------------------------------------------------------------------
select public.tst_as('d1000000-0000-0000-0000-000000000004');

do $$
declare
  denied boolean := false;
  n int;
begin
  assert exists (select 1 from public.drinks where name = 'zz tst drk one renamed'), 'banned user may still read drinks';

  begin
    insert into public.drinks (name, type) values ('zz tst drk by banned', 'red');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'banned user must NOT insert drinks';

  update public.drinks set name = 'zz tst drk four edited' where id = 'd1000000-0000-0000-0001-000000000004';
  get diagnostics n = row_count;
  assert n = 0, 'banned creator must NOT update own drink';

  delete from public.drinks where id = 'd1000000-0000-0000-0001-000000000004';
  get diagnostics n = row_count;
  assert n = 0, 'banned creator must NOT delete own drink';
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
select public.tst_as('d1000000-0000-0000-0000-000000000003');

do $$
declare
  denied boolean := false;
  n int;
begin
  update public.drinks set name = 'zz tst drk four by admin' where id = 'd1000000-0000-0000-0001-000000000004';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to update any drink';

  update public.drinks set name = 'zz tst drk two by admin' where id = 'd1000000-0000-0000-0001-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to update a drink reviewed by others';

  -- guard_drink_type is a trigger, so it applies to admins too
  begin
    update public.drinks set type = 'gin' where id = 'd1000000-0000-0000-0001-000000000002';
  exception when check_violation then denied := true;
  end;
  assert denied, 'guard_drink_type must also block admins';

  delete from public.drinks where id = 'd1000000-0000-0000-0001-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete a reviewed drink';
  assert not exists (select 1 from public.reviews where drink_id = 'd1000000-0000-0000-0001-000000000002'),
    'deleting a drink must cascade to its reviews';

  delete from public.drinks where id = 'd1000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete any drink';

  insert into public.drinks (name, type) values ('zz tst drk by admin', 'port');
  assert exists (select 1 from public.drinks where name = 'zz tst drk by admin'), 'admin must be able to add a drink';
end $$;

-- ---------------------------------------------------------------------------
-- Editor role: constraint state
-- ---------------------------------------------------------------------------
reset role;

do $$
begin
  assert (select convalidated from pg_constraint where conname = 'drinks_other_needs_subtype'),
    'drinks_other_needs_subtype must be validated (0004)';
  raise notice 'drinks: all assertions passed';
end $$;

rollback;
