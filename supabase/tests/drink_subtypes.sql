-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: drink_subtypes privileges and RLS (any active user adds, only admin renames/deletes),
-- name normalization and uniqueness, delete blocked while a drink uses the subtype.
-- Success: the script finishes with the notice 'drink_subtypes: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 regular, 02 other regular, 03 admin, 04 banned (disabled).
insert into auth.users (id, email, raw_user_meta_data) values
  ('d2000000-0000-0000-0000-000000000001', 'd2-one@sip.invalid', '{"nick":"tst-sub-one"}'),
  ('d2000000-0000-0000-0000-000000000002', 'd2-two@sip.invalid', '{"nick":"tst-sub-two"}'),
  ('d2000000-0000-0000-0000-000000000003', 'd2-admin@sip.invalid', '{"nick":"tst-sub-admin"}'),
  ('d2000000-0000-0000-0000-000000000004', 'd2-banned@sip.invalid', '{"nick":"tst-sub-banned"}');
update public.profiles set is_admin = true where id = 'd2000000-0000-0000-0000-000000000003';
update public.profiles set disabled = true where id = 'd2000000-0000-0000-0000-000000000004';

-- 01 is in use by a drink, 02 is unused.
insert into public.drink_subtypes (id, name, created_by) values
  ('d2000000-0000-0000-0002-000000000001', 'zz tst sub whisky', 'd2000000-0000-0000-0000-000000000001'),
  ('d2000000-0000-0000-0002-000000000002', 'zz tst sub unused', 'd2000000-0000-0000-0000-000000000001');
insert into public.drinks (id, name, type, subtype_id, created_by) values
  ('d2000000-0000-0000-0001-000000000001', 'zz tst sub drink', 'other',
   'd2000000-0000-0000-0002-000000000001', 'd2000000-0000-0000-0000-000000000001');

do $$
begin
  assert not has_any_column_privilege('anon', 'public.drink_subtypes', 'select, insert, update'),
    'anon must have no privileges on drink_subtypes';
  assert not has_table_privilege('anon', 'public.drink_subtypes', 'delete'), 'anon must NOT delete drink_subtypes';
end $$;

-- ---------------------------------------------------------------------------
-- Regular user
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d2000000-0000-0000-0000-000000000001');

do $$
declare
  u1 constant uuid := 'd2000000-0000-0000-0000-000000000001';
  u2 constant uuid := 'd2000000-0000-0000-0000-000000000002';
  s2 constant uuid := 'd2000000-0000-0000-0002-000000000002';
  denied boolean;
  n int;
begin
  assert (select count(*) from public.drink_subtypes where name like 'zz tst sub %') = 2, 'user must read drink_subtypes';

  insert into public.drink_subtypes (name) values ('zz tst sub rum');
  assert (select created_by from public.drink_subtypes where name = 'zz tst sub rum') = u1,
    'drink_subtypes.created_by must default to the caller';

  denied := false;
  begin
    insert into public.drink_subtypes (name, created_by) values ('zz tst sub forged', u2);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to set drink_subtypes.created_by';

  -- normalization: case, outer spaces and inner whitespace runs do not make a new name
  denied := false;
  begin
    insert into public.drink_subtypes (name) values ('  ZZ  TST   SUB WHISKY ');
  exception when unique_violation then denied := true;
  end;
  assert denied, 'subtype names must be unique after trim, whitespace collapse and lowercase';

  denied := false;
  begin
    insert into public.drink_subtypes (name) values ('   ');
  exception when check_violation then denied := true;
  end;
  assert denied, 'blank subtype name must be rejected';

  denied := false;
  begin
    insert into public.drink_subtypes (name) values (repeat('s', 41));
  exception when check_violation then denied := true;
  end;
  assert denied, 'subtype name over 40 chars must be rejected';

  -- only admins rename or delete, even the creator (silent no-op)
  update public.drink_subtypes set name = 'zz tst sub renamed' where id = s2;
  get diagnostics n = row_count;
  assert n = 0, 'non-admin creator must NOT rename a subtype';

  delete from public.drink_subtypes where id = s2;
  get diagnostics n = row_count;
  assert n = 0, 'non-admin creator must NOT delete a subtype';
  assert exists (select 1 from public.drink_subtypes where id = s2 and name = 'zz tst sub unused'), 'subtype must be unchanged';

  denied := false;
  begin
    update public.drink_subtypes set created_by = u2 where id = s2;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to update drink_subtypes.created_by';
end $$;

-- ---------------------------------------------------------------------------
-- Other regular user reads what the first one added
-- ---------------------------------------------------------------------------
select public.tst_as('d2000000-0000-0000-0000-000000000002');

do $$
begin
  assert exists (select 1 from public.drink_subtypes where name = 'zz tst sub rum'), 'subtypes must be visible to every signed-in user';
end $$;

-- ---------------------------------------------------------------------------
-- Banned user
-- ---------------------------------------------------------------------------
select public.tst_as('d2000000-0000-0000-0000-000000000004');

do $$
declare
  denied boolean := false;
begin
  assert exists (select 1 from public.drink_subtypes where name = 'zz tst sub rum'), 'banned user may still read subtypes';
  begin
    insert into public.drink_subtypes (name) values ('zz tst sub by banned');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'banned user must NOT add a subtype';
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
select public.tst_as('d2000000-0000-0000-0000-000000000003');

do $$
declare
  s1 constant uuid := 'd2000000-0000-0000-0002-000000000001';
  s2 constant uuid := 'd2000000-0000-0000-0002-000000000002';
  denied boolean := false;
  n int;
begin
  insert into public.drink_subtypes (name) values ('zz tst sub by admin');
  assert exists (select 1 from public.drink_subtypes where name = 'zz tst sub by admin'), 'admin must be able to add a subtype';

  update public.drink_subtypes set name = 'zz tst sub renamed' where id = s2;
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to rename a subtype';

  begin
    update public.drink_subtypes set name = 'ZZ TST SUB RUM' where id = s2;
  exception when unique_violation then denied := true;
  end;
  assert denied, 'renaming onto an existing normalized name must be rejected';

  -- in use: restricted by the drink that references it
  denied := false;
  begin
    delete from public.drink_subtypes where id = s1;
  exception when foreign_key_violation then denied := true;
  end;
  assert denied, 'deleting a subtype in use must be blocked';

  delete from public.drink_subtypes where id = s2;
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete an unused subtype';

  -- once the drink is gone the subtype can go too
  delete from public.drinks where id = 'd2000000-0000-0000-0001-000000000001';
  delete from public.drink_subtypes where id = s1;
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete a subtype after its last drink is removed';
end $$;

reset role;

do $$
begin
  raise notice 'drink_subtypes: all assertions passed';
end $$;

rollback;
