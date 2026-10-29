-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: reviews check constraints (scores shape and range, note rules, at least one stage),
-- one review per author per drink, column locks, ownership on update/delete, banned user, admin delete.
-- Success: the script finishes with the notice 'reviews: all assertions passed' and no error.

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 author, 02 other author, 03 admin, 04 banned (disabled).
insert into auth.users (id, email, raw_user_meta_data) values
  ('d3000000-0000-0000-0000-000000000001', 'd3-author@sip.invalid', '{"nick":"tst-rev-author"}'),
  ('d3000000-0000-0000-0000-000000000002', 'd3-other@sip.invalid', '{"nick":"tst-rev-other"}'),
  ('d3000000-0000-0000-0000-000000000003', 'd3-admin@sip.invalid', '{"nick":"tst-rev-admin"}'),
  ('d3000000-0000-0000-0000-000000000004', 'd3-banned@sip.invalid', '{"nick":"tst-rev-banned"}');
update public.profiles set is_admin = true where id = 'd3000000-0000-0000-0000-000000000003';
update public.profiles set disabled = true where id = 'd3000000-0000-0000-0000-000000000004';

insert into public.drinks (id, name, type, created_by) values
  ('d3000000-0000-0000-0001-000000000001', 'zz tst rev one', 'red', 'd3000000-0000-0000-0000-000000000001'),
  ('d3000000-0000-0000-0001-000000000002', 'zz tst rev two', 'red', 'd3000000-0000-0000-0000-000000000001'),
  ('d3000000-0000-0000-0001-000000000003', 'zz tst rev three', 'red', 'd3000000-0000-0000-0000-000000000001'),
  ('d3000000-0000-0000-0001-000000000004', 'zz tst rev four', 'red', 'd3000000-0000-0000-0000-000000000001');

-- 01: other author's review on drink 1. 02: author's review on drink 3 with a stale updated_at.
-- 03: banned user's review on drink 4.
insert into public.reviews (id, drink_id, author_id, first_scores, updated_at) values
  ('d3000000-0000-0000-0003-000000000001', 'd3000000-0000-0000-0001-000000000001',
   'd3000000-0000-0000-0000-000000000002', '{"a":1,"b":2,"c":3,"d":4}', now()),
  ('d3000000-0000-0000-0003-000000000002', 'd3000000-0000-0000-0001-000000000003',
   'd3000000-0000-0000-0000-000000000001', '{"a":1,"b":2,"c":3,"d":4}', now() - interval '1 day'),
  ('d3000000-0000-0000-0003-000000000003', 'd3000000-0000-0000-0001-000000000004',
   'd3000000-0000-0000-0000-000000000004', '{"a":1,"b":2,"c":3,"d":4}', now());

-- ---------------------------------------------------------------------------
-- Author
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d3000000-0000-0000-0000-000000000001');

do $$
declare
  u1 constant uuid := 'd3000000-0000-0000-0000-000000000001';
  u2 constant uuid := 'd3000000-0000-0000-0000-000000000002';
  d1 constant uuid := 'd3000000-0000-0000-0001-000000000001';
  d2 constant uuid := 'd3000000-0000-0000-0001-000000000002';
  d3 constant uuid := 'd3000000-0000-0000-0001-000000000003';
  r_other constant uuid := 'd3000000-0000-0000-0003-000000000001';
  r_stale constant uuid := 'd3000000-0000-0000-0003-000000000002';
  bad_first text[] := array[
    '{"a":1,"b":2,"c":3}',
    '{"a":1,"b":2,"c":3,"d":4,"e":5}',
    '{}',
    '{"a":1,"b":2,"c":3,"d":11}',
    '{"a":1,"b":2,"c":3,"d":-1}',
    '{"a":1,"b":2,"c":3,"d":7.5}',
    '{"a":1,"b":2,"c":3,"d":"5"}',
    '{"a":1,"b":2,"c":3,"d":null}'
  ];
  bad_shape text[] := array['[1,2,3,4]', '5', '"text"'];
  s text;
  rid uuid;
  denied boolean;
  n int;
begin
  -- insert: author_id defaults to the caller, boundary scores 0 and 10 are valid
  insert into public.reviews (drink_id, first_scores) values (d2, '{"a":0,"b":10,"c":5,"d":1}');
  select id into rid from public.reviews where drink_id = d2 and author_id = u1;
  assert rid is not null, 'review insert must default author_id to the caller';

  -- one review per author per drink
  denied := false;
  begin
    insert into public.reviews (drink_id, first_scores) values (d2, '{"a":1,"b":2,"c":3,"d":4}');
  exception when unique_violation then denied := true;
  end;
  assert denied, 'a second review by the same author on the same drink must be rejected';

  -- the other author may review the same drink (unique is per author)
  -- (checked below as the other author)

  -- at least one stage
  denied := false;
  begin
    insert into public.reviews (drink_id, first_note) values (d1, 'only a note');
  exception when check_violation then denied := true;
  end;
  assert denied, 'a review with neither first_scores nor final_scores must be rejected';

  -- first_scores shape and range
  foreach s in array bad_first loop
    denied := false;
    begin
      insert into public.reviews (drink_id, first_scores) values (d1, s::jsonb);
    exception when check_violation then denied := true;
    end;
    assert denied, format('first_scores must be rejected: %s', s);
  end loop;

  -- non-object JSON: either the check or jsonb_object_keys rejects it
  foreach s in array bad_shape loop
    denied := false;
    begin
      insert into public.reviews (drink_id, first_scores) values (d1, s::jsonb);
    exception when check_violation or invalid_parameter_value then denied := true;
    end;
    assert denied, format('non-object first_scores must be rejected: %s', s);
  end loop;

  -- final stage rules (update the review from above)
  denied := false;
  begin
    update public.reviews set final_scores = '{"a":5}' where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_scores without final_note must be rejected';

  denied := false;
  begin
    update public.reviews set final_scores = '{"a":5}', final_note = repeat('n', 29) where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_note shorter than 30 chars must be rejected';

  denied := false;
  begin
    update public.reviews set final_scores = '{"a":5}', final_note = repeat('n', 27) || '   ' where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_note length must be counted after trim';

  denied := false;
  begin
    update public.reviews set final_scores = '{}', final_note = repeat('n', 30) where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_scores with zero keys must be rejected';

  denied := false;
  begin
    update public.reviews set final_scores = '{"a":1,"b":2,"c":3,"d":4,"e":5}', final_note = repeat('n', 30) where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_scores with more than 4 keys must be rejected';

  denied := false;
  begin
    update public.reviews set final_scores = '{"a":5}', final_note = repeat('n', 30) where id = rid;
    update public.reviews set final_scores = '{"a":11}' where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'final_scores values above 10 must be rejected';

  update public.reviews set final_scores = '{"a":5}', final_note = repeat('n', 30) where id = rid;
  get diagnostics n = row_count;
  assert n = 1, 'final stage with one score and a 30 char note must be accepted';

  update public.reviews set final_scores = '{"a":1,"b":2,"c":3,"d":4}' where id = rid;
  get diagnostics n = row_count;
  assert n = 1, 'final_scores with 4 keys must be accepted';

  denied := false;
  begin
    update public.reviews set first_scores = null, final_scores = null, final_note = null where id = rid;
  exception when check_violation then denied := true;
  end;
  assert denied, 'clearing both stages must be rejected';

  -- column locks
  denied := false;
  begin
    update public.reviews set author_id = u2 where id = rid;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to update reviews.author_id';

  denied := false;
  begin
    update public.reviews set drink_id = d1 where id = rid;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to update reviews.drink_id';

  denied := false;
  begin
    insert into public.reviews (drink_id, author_id, first_scores) values (d1, u2, '{"a":1,"b":2,"c":3,"d":4}');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to set reviews.author_id on insert';

  -- updated_at is bumped by the trigger
  update public.reviews set first_note = 'edited' where id = r_stale;
  get diagnostics n = row_count;
  assert n = 1, 'author must be able to edit own review';
  assert (select updated_at from public.reviews where id = r_stale) > now() - interval '1 hour',
    'set_updated_at must bump updated_at on update';

  -- ownership: someone else's review is visible but untouchable (silent no-op)
  assert exists (select 1 from public.reviews where id = r_other), 'reviews must be readable by every signed-in user';

  update public.reviews set first_note = 'hijack' where id = r_other;
  get diagnostics n = row_count;
  assert n = 0, 'user must NOT update another author''s review';

  delete from public.reviews where id = r_other;
  get diagnostics n = row_count;
  assert n = 0, 'user must NOT delete another author''s review';
  assert exists (select 1 from public.reviews where id = r_other and first_note is null), 'foreign review must be unchanged';
end $$;

-- ---------------------------------------------------------------------------
-- Other author: same drink as the first author, own review
-- ---------------------------------------------------------------------------
select public.tst_as('d3000000-0000-0000-0000-000000000002');

do $$
declare
  n int;
begin
  insert into public.reviews (drink_id, first_scores) values ('d3000000-0000-0000-0001-000000000002', '{"a":1,"b":2,"c":3,"d":4}');
  assert (select count(*) from public.reviews where drink_id = 'd3000000-0000-0000-0001-000000000002') = 2,
    'two different authors may review the same drink';

  delete from public.reviews where drink_id = 'd3000000-0000-0000-0001-000000000002' and author_id = 'd3000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'user must NOT delete the first author''s review';
end $$;

-- ---------------------------------------------------------------------------
-- Banned user
-- ---------------------------------------------------------------------------
select public.tst_as('d3000000-0000-0000-0000-000000000004');

do $$
declare
  denied boolean := false;
  n int;
begin
  begin
    insert into public.reviews (drink_id, first_scores) values ('d3000000-0000-0000-0001-000000000001', '{"a":1,"b":2,"c":3,"d":4}');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'banned user must NOT insert reviews';

  update public.reviews set first_note = 'edit' where id = 'd3000000-0000-0000-0003-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'banned author must NOT update own review';

  delete from public.reviews where id = 'd3000000-0000-0000-0003-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'banned author must NOT delete own review';
end $$;

-- ---------------------------------------------------------------------------
-- Admin: may delete any review, may NOT edit one
-- ---------------------------------------------------------------------------
select public.tst_as('d3000000-0000-0000-0000-000000000003');

do $$
declare
  n int;
begin
  update public.reviews set first_note = 'admin edit' where id = 'd3000000-0000-0000-0003-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'admin must NOT edit another author''s review';

  delete from public.reviews where id = 'd3000000-0000-0000-0003-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete any review';

  delete from public.reviews where id = 'd3000000-0000-0000-0003-000000000003';
  get diagnostics n = row_count;
  assert n = 1, 'admin must be able to delete a banned user''s review';

  insert into public.reviews (drink_id, first_scores) values ('d3000000-0000-0000-0001-000000000004', '{"a":1,"b":2,"c":3,"d":4}');
  assert exists (select 1 from public.reviews where drink_id = 'd3000000-0000-0000-0001-000000000004'
    and author_id = 'd3000000-0000-0000-0000-000000000003'), 'admin may review like anyone else';
end $$;

-- ---------------------------------------------------------------------------
-- Editor role: deleting a drink cascades to its reviews
-- ---------------------------------------------------------------------------
reset role;

do $$
begin
  delete from public.drinks where id = 'd3000000-0000-0000-0001-000000000003';
  assert not exists (select 1 from public.reviews where drink_id = 'd3000000-0000-0000-0001-000000000003'),
    'reviews must cascade with their drink';
  raise notice 'reviews: all assertions passed';
end $$;

rollback;
