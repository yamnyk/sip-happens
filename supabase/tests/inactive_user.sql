-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: the is_active() write block. A banned user (profiles.disabled) or a valid token without a profile
-- can still read but cannot write anything, and un-banning takes effect immediately (no token refresh).
-- Success: the script finishes with the notice 'inactive_user: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 active, 02 banned. 03 is a JWT subject with no profile at all (never created).
insert into auth.users (id, email, raw_user_meta_data) values
  ('d6000000-0000-0000-0000-000000000001', 'd6-active@sip.invalid', '{"nick":"tst-ina-active"}'),
  ('d6000000-0000-0000-0000-000000000002', 'd6-banned@sip.invalid', '{"nick":"tst-ina-banned"}');
update public.profiles set disabled = true where id = 'd6000000-0000-0000-0000-000000000002';

insert into public.drink_subtypes (id, name, created_by) values
  ('d6000000-0000-0000-0002-000000000001', 'zz tst ina sub', 'd6000000-0000-0000-0000-000000000001');
insert into public.drinks (id, name, type, created_by) values
  ('d6000000-0000-0000-0001-000000000001', 'zz tst ina banned drink', 'red', 'd6000000-0000-0000-0000-000000000002'),
  ('d6000000-0000-0000-0001-000000000002', 'zz tst ina active drink', 'red', 'd6000000-0000-0000-0000-000000000001');
insert into public.reviews (id, drink_id, author_id, first_scores) values
  ('d6000000-0000-0000-0003-000000000001', 'd6000000-0000-0000-0001-000000000002',
   'd6000000-0000-0000-0000-000000000002', '{"a":1,"b":2,"c":3,"d":4}');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Banned user and profile-less subject: same expectations
-- ---------------------------------------------------------------------------
do $$
declare
  who uuid;
  denied boolean;
  n int;
begin
  foreach who in array array['d6000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000003']::uuid[] loop
    perform public.tst_as(who);

    assert not (select public.is_active()), 'is_active() must be false for ' || who;
    assert not (select public.is_admin()), 'is_admin() must be false for ' || who;
    assert exists (select 1 from public.drinks where name = 'zz tst ina active drink'), 'reads must still work for ' || who;

    denied := false;
    begin
      insert into public.drinks (name, type) values ('zz tst ina new drink', 'red');
    exception when insufficient_privilege then denied := true;
    end;
    assert denied, 'inactive user must NOT insert drinks: ' || who;

    denied := false;
    begin
      insert into public.drink_subtypes (name) values ('zz tst ina new sub');
    exception when insufficient_privilege then denied := true;
    end;
    assert denied, 'inactive user must NOT insert subtypes: ' || who;

    denied := false;
    begin
      insert into public.reviews (drink_id, first_scores)
        values ('d6000000-0000-0000-0001-000000000002', '{"a":1,"b":2,"c":3,"d":4}');
    exception when insufficient_privilege then denied := true;
    end;
    assert denied, 'inactive user must NOT insert reviews: ' || who;

    denied := false;
    begin
      insert into public.links (kind) values ('invite');
    exception when insufficient_privilege then denied := true;
    end;
    assert denied, 'inactive user must NOT create invite links: ' || who;

    update public.reviews set first_note = 'edit' where id = 'd6000000-0000-0000-0003-000000000001';
    get diagnostics n = row_count;
    assert n = 0, 'inactive user must NOT update a review: ' || who;

    delete from public.reviews where id = 'd6000000-0000-0000-0003-000000000001';
    get diagnostics n = row_count;
    assert n = 0, 'inactive user must NOT delete a review: ' || who;

    update public.drinks set name = 'zz tst ina edited' where id = 'd6000000-0000-0000-0001-000000000001';
    get diagnostics n = row_count;
    assert n = 0, 'inactive user must NOT update a drink: ' || who;

    delete from public.drinks where id = 'd6000000-0000-0000-0001-000000000001';
    get diagnostics n = row_count;
    assert n = 0, 'inactive user must NOT delete a drink: ' || who;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Un-ban takes effect on the very next statement (same token)
-- ---------------------------------------------------------------------------
reset role;
update public.profiles set disabled = false where id = 'd6000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.tst_as('d6000000-0000-0000-0000-000000000002');

do $$
declare
  n int;
begin
  assert (select public.is_active()), 'un-banned user must be active again';
  insert into public.drinks (name, type) values ('zz tst ina back', 'white');
  update public.drinks set name = 'zz tst ina back edited' where id = 'd6000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'un-banned creator must be able to edit own drink again';
end $$;

-- ---------------------------------------------------------------------------
-- And the other way: banning an active user mid-session blocks their next write
-- ---------------------------------------------------------------------------
reset role;
update public.profiles set disabled = true where id = 'd6000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.tst_as('d6000000-0000-0000-0000-000000000002');

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.drinks (name, type) values ('zz tst ina after ban', 'white');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'banning a user must block their next write';
end $$;

reset role;

do $$
begin
  raise notice 'inactive_user: all assertions passed';
end $$;

rollback;
