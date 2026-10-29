-- Run in the Supabase SQL editor AFTER applying migrations. Everything rolls back at the end.
-- Covers: execute privileges of the helper functions, create_reset_request (silent per-account cap,
-- junk cap, one pending request per nick), claim_link, revoke_sessions.
-- Success: the script finishes with the notice 'functions_and_privileges: all assertions passed' and no error.
-- Note: revoke_sessions fixtures insert minimal rows into auth.sessions (id, user_id).

begin;

-- Test helper: impersonate a user (JWT sub) while running as role authenticated. Rolled back with the rest.
create function public.tst_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
grant execute on function public.tst_as(uuid) to authenticated;

-- Users: 01 victim (invited by 02), 02 inviter, 03 stranger, 04 second victim, 05 banned inviter.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d4000000-0000-0000-0000-000000000002', 'd4-inviter@sip.invalid', '{"nick":"tst-fn-inviter"}'),
  ('d4000000-0000-0000-0000-000000000003', 'd4-stranger@sip.invalid', '{"nick":"tst-fn-stranger"}'),
  ('d4000000-0000-0000-0000-000000000004', 'd4-victim2@sip.invalid', '{"nick":"tst-fn-victim2"}'),
  ('d4000000-0000-0000-0000-000000000005', 'd4-banned@sip.invalid', '{"nick":"tst-fn-banned"}');
insert into auth.users (id, email, raw_user_meta_data) values
  ('d4000000-0000-0000-0000-000000000001', 'd4-victim@sip.invalid',
   '{"nick":"tst-fn-victim","invited_by":"d4000000-0000-0000-0000-000000000002"}');
update public.profiles set disabled = true where id = 'd4000000-0000-0000-0000-000000000005';

-- ---------------------------------------------------------------------------
-- Execute privileges (service_role only for the privileged functions)
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_reset_request(text, text)', 'public.claim_link(uuid, text)', 'public.revoke_sessions(uuid)'
  ] loop
    assert has_function_privilege('service_role', f, 'execute'), f || ' must be executable by service_role';
    assert not has_function_privilege('authenticated', f, 'execute'), f || ' must NOT be executable by authenticated';
    assert not has_function_privilege('anon', f, 'execute'), f || ' must NOT be executable by anon';
  end loop;

  assert not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'handle_new_user must not be callable by authenticated';
  assert not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), 'handle_new_user must not be callable by anon';

  foreach f in array array['public.is_admin()', 'public.is_active()'] loop
    assert has_function_privilege('authenticated', f, 'execute'), f || ' must be executable by authenticated';
    assert has_function_privilege('service_role', f, 'execute'), f || ' must be executable by service_role';
    assert not has_function_privilege('anon', f, 'execute'), f || ' must NOT be executable by anon';
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- create_reset_request (called as the editor role, which owns the function)
-- ---------------------------------------------------------------------------
do $$
declare
  v constant uuid := 'd4000000-0000-0000-0000-000000000001';
  s constant uuid := 'd4000000-0000-0000-0000-000000000003';
  w constant uuid := 'd4000000-0000-0000-0000-000000000004';
  r text;
begin
  -- blank input: 'ok', nothing stored
  r := public.create_reset_request('   ', 'tst-fn-blank');
  assert r = 'ok', 'blank nick must answer ok';
  r := public.create_reset_request('tst-fn-victim', '   ');
  assert r = 'ok', 'blank inviter must answer ok';
  assert not exists (select 1 from public.reset_requests where inviter_nick = 'tst-fn-blank' or user_id = v),
    'blank input must not store a request';

  -- known nick with the right inviter
  r := public.create_reset_request('tst-fn-victim', 'tst-fn-inviter');
  assert r = 'ok', 'create_reset_request must answer ok';
  assert (select count(*) from public.reset_requests where user_id = v and inviter_matches) = 1,
    'request must be linked to the user with inviter_matches true';

  -- one pending request per nick, case-insensitive
  r := public.create_reset_request('TST-FN-Victim', 'tst-fn-inviter');
  assert r = 'ok' and (select count(*) from public.reset_requests where user_id = v) = 1,
    'a second pending request for the same nick must be dropped';

  -- per-account cap: 3 per hour, 4th is dropped silently with the same answer
  update public.reset_requests set resolved_at = now() where user_id = v and resolved_at is null;
  r := public.create_reset_request('tst-fn-victim', 'tst-fn-inviter');
  update public.reset_requests set resolved_at = now() where user_id = v and resolved_at is null;
  r := public.create_reset_request('tst-fn-victim', 'tst-fn-stranger');
  assert (select count(*) from public.reset_requests where user_id = v) = 3, 'three requests must be stored';
  assert (select count(*) from public.reset_requests where user_id = v and inviter_matches) = 2,
    'inviter_matches must be false when the named inviter is not the real one';

  update public.reset_requests set resolved_at = now() where user_id = v and resolved_at is null;
  r := public.create_reset_request('tst-fn-victim', 'tst-fn-inviter');
  assert r = 'ok', 'a capped account must still get ok (no oracle, no lockout message)';
  assert (select count(*) from public.reset_requests where user_id = v) = 3, 'the 4th request within an hour must be dropped';

  -- other accounts are independent, no invited_by means no match
  r := public.create_reset_request('tst-fn-victim2', 'tst-fn-inviter');
  assert r = 'ok' and (select count(*) from public.reset_requests where user_id = w and not inviter_matches) = 1,
    'a capped account must not affect others';

  -- unknown nick: stored without a user
  r := public.create_reset_request('tst-fn-nobody', 'tst-fn-inviter');
  assert r = 'ok' and exists (select 1 from public.reset_requests where nick = 'tst-fn-nobody' and user_id is null and not inviter_matches),
    'unknown nick must be stored as junk without a user';

  -- junk cap: 100 unknown-nick rows per hour, then silently dropped
  insert into public.reset_requests (nick, inviter_nick, resolved_at)
    select 'tst-fn-junk-' || g, 'nobody', now() from generate_series(1, 100) g;
  r := public.create_reset_request('tst-fn-junk-new', 'tst-fn-inviter');
  assert r = 'ok' and not exists (select 1 from public.reset_requests where nick = 'tst-fn-junk-new'),
    'junk over the cap must be dropped silently';

  -- a flood on real accounts never blocks anyone else (no global cap since 0003)
  insert into public.reset_requests (nick, inviter_nick, user_id, resolved_at)
    select 'tst-fn-stranger', 'nobody', s, now() from generate_series(1, 25);
  update public.reset_requests set resolved_at = now() where user_id = w and resolved_at is null;
  r := public.create_reset_request('tst-fn-victim2', 'tst-fn-inviter');
  assert r = 'ok' and (select count(*) from public.reset_requests where user_id = w) = 2,
    'junk and other accounts must not block a real account';
  r := public.create_reset_request('tst-fn-stranger', 'tst-fn-inviter');
  assert r = 'ok' and (select count(*) from public.reset_requests where user_id = s) = 25,
    'the flooded account itself is capped';
end $$;

-- ---------------------------------------------------------------------------
-- claim_link (single use, kind match, expiry, creator not banned)
-- ---------------------------------------------------------------------------
insert into public.links (token, kind, created_by, target_user_id, expires_at) values
  ('d4000000-0000-0000-0004-000000000001', 'invite', 'd4000000-0000-0000-0000-000000000002', null, now() + interval '1 day'),
  ('d4000000-0000-0000-0004-000000000002', 'invite', 'd4000000-0000-0000-0000-000000000005', null, now() + interval '1 day'),
  ('d4000000-0000-0000-0004-000000000003', 'invite', 'd4000000-0000-0000-0000-000000000002', null, now() - interval '1 day'),
  ('d4000000-0000-0000-0004-000000000004', 'reset', 'd4000000-0000-0000-0000-000000000002',
   'd4000000-0000-0000-0000-000000000001', now() + interval '1 day');

do $$
declare
  inv uuid;
  tgt uuid;
begin
  select inviter_id into inv from public.claim_link('d4000000-0000-0000-0004-000000000001', 'reset');
  assert not found, 'claim_link must reject a kind mismatch';

  select inviter_id into inv from public.claim_link('d4000000-0000-0000-0004-000000000001', 'invite');
  assert found and inv = 'd4000000-0000-0000-0000-000000000002', 'claim_link must return the inviter';

  select inviter_id into inv from public.claim_link('d4000000-0000-0000-0004-000000000001', 'invite');
  assert not found, 'claim_link must be single use';

  select inviter_id into inv from public.claim_link('d4000000-0000-0000-0004-000000000002', 'invite');
  assert not found, 'claim_link must reject a link whose creator is disabled';

  select inviter_id into inv from public.claim_link('d4000000-0000-0000-0004-000000000003', 'invite');
  assert not found, 'claim_link must reject an expired link';

  select target_id into tgt from public.claim_link('d4000000-0000-0000-0004-000000000004', 'reset');
  assert found and tgt = 'd4000000-0000-0000-0000-000000000001', 'claim_link must return the reset target';
end $$;

-- ---------------------------------------------------------------------------
-- revoke_sessions
-- ---------------------------------------------------------------------------
insert into auth.sessions (id, user_id) values
  ('d4000000-0000-0000-0005-000000000001', 'd4000000-0000-0000-0000-000000000001'),
  ('d4000000-0000-0000-0005-000000000002', 'd4000000-0000-0000-0000-000000000001'),
  ('d4000000-0000-0000-0005-000000000003', 'd4000000-0000-0000-0000-000000000004');

do $$
begin
  perform public.revoke_sessions('d4000000-0000-0000-0000-000000000001');
  assert not exists (select 1 from auth.sessions where user_id = 'd4000000-0000-0000-0000-000000000001'),
    'revoke_sessions must delete every session of the user';
  assert exists (select 1 from auth.sessions where user_id = 'd4000000-0000-0000-0000-000000000004'),
    'revoke_sessions must not touch other users';
end $$;

-- ---------------------------------------------------------------------------
-- Signed-in users cannot call the privileged functions
-- ---------------------------------------------------------------------------
set local role authenticated;
select public.tst_as('d4000000-0000-0000-0000-000000000004');

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.revoke_sessions('d4000000-0000-0000-0000-000000000004');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'revoke_sessions must be service_role only';
end $$;

reset role;

do $$
begin
  assert exists (select 1 from auth.sessions where user_id = 'd4000000-0000-0000-0000-000000000004'),
    'a denied revoke_sessions call must not delete sessions';
  raise notice 'functions_and_privileges: all assertions passed';
end $$;

rollback;
