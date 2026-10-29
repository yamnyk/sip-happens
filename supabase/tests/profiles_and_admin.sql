-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: profiles are read-only to clients, no admin smuggling, links/reset_requests/reviews column locks.
-- Success: the script finishes with the notice 'profiles_and_admin: all assertions passed' and no error.
-- Any failed assertion aborts with a message naming the broken guarantee.

begin;

-- Fixtures (inserted as the editor role, which fires the profile trigger).
-- a3 tries to smuggle admin through user metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@sip.invalid', '{"nick":"tester-one"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@sip.invalid', '{"nick":"tester-two"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@sip.invalid', '{"nick":"tester-three","is_admin":true,"role":"admin"}');

do $$
begin
  assert (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-0000000000a%') = 3,
    'trigger must create 3 profiles';
  assert not exists (select 1 from public.profiles where id::text like '00000000-0000-0000-0000-0000000000a%' and is_admin),
    'handle_new_user must never set is_admin from metadata';
end $$;

-- A pending reset request visible only to admins.
insert into public.reset_requests (nick, inviter_nick) values ('tester-one', 'someone');

-- Become an authenticated, non-admin user.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text,
  true
);

do $$
declare
  denied boolean;
  n int;
begin
  assert (select public.is_admin()) = false, 'is_admin() must be false for a normal user';

  -- 1. cannot set is_admin on self
  denied := false;
  begin
    update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000000a1';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT be able to update profiles.is_admin';

  -- 2. cannot set disabled / nick / invited_by
  denied := false;
  begin
    update public.profiles set nick = 'hacked-nick' where id = '00000000-0000-0000-0000-0000000000a1';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT be able to update profiles.nick';

  denied := false;
  begin
    update public.profiles set disabled = false where id = '00000000-0000-0000-0000-0000000000a1';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT be able to update profiles.disabled';

  -- 3. cannot insert or delete profiles
  denied := false;
  begin
    insert into public.profiles (id, nick, is_admin) values (gen_random_uuid(), 'sneaky-admin', true);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT be able to insert profiles';

  denied := false;
  begin
    delete from public.profiles where id = '00000000-0000-0000-0000-0000000000a2';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must NOT be able to delete profiles';

  -- 4. cannot create a reset link (admin only), can create an invite link
  denied := false;
  begin
    insert into public.links (kind, target_user_id) values ('reset', '00000000-0000-0000-0000-0000000000a2');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'non-admin must NOT be able to insert reset links';

  insert into public.links (kind) values ('invite');
  select count(*) into n from public.links where kind = 'invite';
  assert n = 1, 'user must be able to create and read own invite link';

  -- 5. cannot forge link ownership or expiry
  denied := false;
  begin
    insert into public.links (kind, expires_at) values ('invite', now() + interval '10 years');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to set links.expires_at';

  -- 6. reset_requests invisible to non-admin
  select count(*) into n from public.reset_requests;
  assert n = 0, 'non-admin must see zero reset_requests rows';

  denied := false;
  begin
    insert into public.reset_requests (nick, inviter_nick) values ('x', 'y');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'non-admin must NOT insert reset_requests';

  -- 7. privileged functions are not callable by authenticated
  denied := false;
  begin
    perform public.create_reset_request('a', 'b');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'create_reset_request must be service_role only';

  denied := false;
  begin
    perform * from public.claim_link(gen_random_uuid(), 'invite');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'claim_link must be service_role only';

  -- 8. cannot write a review as someone else
  denied := false;
  begin
    insert into public.reviews (drink_id, first_scores) values (gen_random_uuid(), '{"a":1,"b":2,"c":3,"d":4}');
  exception when insufficient_privilege or foreign_key_violation then denied := true;
  end;
  assert denied, 'review insert with an unknown drink must fail';

  denied := false;
  begin
    insert into public.reviews (author_id, drink_id, first_scores) values
      ('00000000-0000-0000-0000-0000000000a2', gen_random_uuid(), '{"a":1,"b":2,"c":3,"d":4}');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'client must NOT be able to set reviews.author_id';
end $$;

-- Back to the editor role: confirm nothing leaked through.
reset role;

do $$
begin
  assert not exists (
    select 1 from public.profiles
    where is_admin and id::text like '00000000-0000-0000-0000-0000000000a%'
  ), 'no test profile may be admin after the test';
  assert (select nick from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'tester-one',
    'nick must be unchanged';
  raise notice 'profiles_and_admin: all assertions passed';
end $$;

rollback;
