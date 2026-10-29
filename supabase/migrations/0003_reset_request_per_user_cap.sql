-- Replace the global cap on reset requests with a silent per-account cap.
-- Before: 20 requests per hour for real accounts, shared by everyone, so anyone who knew one nick
-- could block password resets for the whole group.
-- Now: each account is capped on its own and the answer is always 'ok', so there is no lockout and
-- no nick oracle. Junk for unknown nicks keeps its separate silent cap.
-- Idempotent: safe to re-run in the SQL editor. Apply AFTER 0002_drink_subtypes.sql.

create or replace function public.create_reset_request(p_nick text, p_inviter_nick text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nick text := btrim(left(coalesce(p_nick, ''), 64));
  v_inviter_nick text := btrim(left(coalesce(p_inviter_nick, ''), 64));
  v_user uuid;
  v_inviter uuid;
  v_matches boolean := false;
begin
  if v_nick = '' or v_inviter_nick = '' then
    return 'ok';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.create_reset_request'));

  select p.id into v_user from public.profiles p where p.nick_normalized = lower(normalize(v_nick, NFC));
  select p.id into v_inviter from public.profiles p where p.nick_normalized = lower(normalize(v_inviter_nick, NFC));

  if v_user is null then
    -- Junk for unknown nicks is capped and silently dropped, so it cannot fill the table.
    if (select count(*) from public.reset_requests
        where created_at > now() - interval '1 hour' and user_id is null) >= 100 then
      return 'ok';
    end if;
  elsif (select count(*) from public.reset_requests
         where created_at > now() - interval '1 hour' and user_id = v_user) >= 3 then
    -- Per-account cap, silently dropped: flooding one nick never affects anyone else.
    return 'ok';
  end if;

  if v_user is not null and v_inviter is not null then
    v_matches := exists (select 1 from public.profiles p where p.id = v_user and p.invited_by = v_inviter);
  end if;

  insert into public.reset_requests (nick, inviter_nick, user_id, inviter_matches)
  values (v_nick, v_inviter_nick, v_user, v_matches)
  on conflict do nothing;

  return 'ok';
end;
$$;
revoke execute on function public.create_reset_request(text, text) from public, anon, authenticated;
grant execute on function public.create_reset_request(text, text) to service_role;
