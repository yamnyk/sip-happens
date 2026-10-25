-- sip-happens: initial schema, RLS, triggers and functions.
-- Idempotent: safe to re-run in the SQL editor. Order: tables, helpers, triggers, grants, RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 3 and 24),
  nick_normalized text generated always as (lower(normalize(nick, NFC))) stored unique,
  is_admin boolean not null default false,
  disabled boolean not null default false,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists profiles_invited_by_idx on public.profiles (invited_by);

create table if not exists public.links (
  token uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invite', 'reset')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  constraint links_target_matches_kind check ((kind = 'reset') = (target_user_id is not null))
);
create index if not exists links_created_by_idx on public.links (created_by);
create index if not exists links_target_user_id_idx on public.links (target_user_id) where target_user_id is not null;
create index if not exists links_used_by_idx on public.links (used_by) where used_by is not null;

create table if not exists public.drinks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  name_normalized text generated always as (lower(normalize(btrim(name), NFC))) stored unique,
  type text not null check (type in ('red', 'white', 'rose', 'sparkling', 'port', 'gin', 'other')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists drinks_created_by_idx on public.drinks (created_by);

-- Validates a scores object: JSON object, integer values 0-10, key count within [min_keys, max_keys].
-- Exact key names are enforced by zod and the handlers, not here.
create or replace function public.scores_valid(s jsonb, min_keys int, max_keys int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s is null or (
    jsonb_typeof(s) = 'object'
    and (select count(*) from jsonb_object_keys(s)) between min_keys and max_keys
    and not exists (
      select 1 from jsonb_each(s) e
      where jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}') !~ '^(10|[0-9])$'
    )
  );
$$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  drink_id uuid not null references public.drinks (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  first_scores jsonb,
  first_note text,
  final_scores jsonb,
  final_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_per_author unique (drink_id, author_id),
  constraint reviews_at_least_one_stage check (first_scores is not null or final_scores is not null),
  constraint reviews_final_note_len check (final_note is null or char_length(btrim(final_note)) >= 30),
  constraint reviews_final_needs_note check (final_scores is null or final_note is not null),
  constraint reviews_first_scores_valid check (public.scores_valid(first_scores, 4, 4)),
  constraint reviews_final_scores_valid check (public.scores_valid(final_scores, 1, 4))
);
-- drink_id is covered by the unique (drink_id, author_id) index.
create index if not exists reviews_author_id_idx on public.reviews (author_id);

create table if not exists public.reset_requests (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  inviter_nick text not null,
  user_id uuid references public.profiles (id) on delete set null,
  inviter_matches boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index if not exists reset_requests_user_id_idx on public.reset_requests (user_id) where user_id is not null;
create index if not exists reset_requests_resolved_by_idx on public.reset_requests (resolved_by) where resolved_by is not null;
create index if not exists reset_requests_created_at_idx on public.reset_requests (created_at);
-- One pending request per nick (case and unicode-normalization insensitive).
create unique index if not exists reset_requests_one_pending_per_nick
  on public.reset_requests ((lower(normalize(nick, NFC)))) where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- True only for the calling user when their profile is admin and not disabled.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin and not p.disabled from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- True when the calling user has a profile that is not disabled. Gates every client write,
-- so a banned user's still-valid access token cannot write anything.
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select not p.disabled from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;
revoke execute on function public.is_active() from public, anon;
grant execute on function public.is_active() to authenticated, service_role;

create or replace function public.drink_group(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when t in ('red', 'white', 'rose', 'sparkling') then 'wine' else t end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profile creation from auth.users. Reads ONLY nick and invited_by from metadata. Never sets admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nick, invited_by)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nick',
    nullif(new.raw_user_meta_data ->> 'invited_by', '')::uuid
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- A drink's type may change within its group freely, across groups only while it has no reviews.
create or replace function public.guard_drink_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type is distinct from old.type
     and public.drink_group(new.type) <> public.drink_group(old.type)
     and exists (select 1 from public.reviews r where r.drink_id = old.id) then
    raise exception 'drink type cannot change across groups once reviewed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Atomic single-use link claim using database time. service_role only.
create or replace function public.claim_link(p_token uuid, p_kind text)
returns table (inviter_id uuid, target_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.links l
  set used_at = now()
  where l.token = p_token
    and l.kind = p_kind
    and l.used_at is null
    and l.expires_at > now()
    and exists (select 1 from public.profiles p where p.id = l.created_by and not p.disabled)
  returning l.created_by, l.target_user_id;
$$;
revoke execute on function public.claim_link(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_link(uuid, text) to service_role;

-- Kills every session and refresh token of a user. service_role only.
create or replace function public.revoke_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user;
$$;
revoke execute on function public.revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_sessions(uuid) to service_role;

-- Public forgot-password form backend. Always looks the same to the caller except the global cap.
-- Returns 'ok' or 'rate_limited'. service_role only.
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

  -- Cap on requests for real accounts. The answer does not depend on the input, so it is no nick oracle.
  if (select count(*) from public.reset_requests
      where created_at > now() - interval '1 hour' and user_id is not null) >= 20 then
    return 'rate_limited';
  end if;

  select p.id into v_user from public.profiles p where p.nick_normalized = lower(normalize(v_nick, NFC));
  select p.id into v_inviter from public.profiles p where p.nick_normalized = lower(normalize(v_inviter_nick, NFC));

  -- Junk for unknown nicks is capped separately and silently dropped, so it cannot block real users.
  if v_user is null
     and (select count(*) from public.reset_requests
          where created_at > now() - interval '1 hour' and user_id is null) >= 100 then
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

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

drop trigger if exists drinks_guard_type on public.drinks;
create trigger drinks_guard_type
  before update of type on public.drinks
  for each row execute function public.guard_drink_type();

-- ---------------------------------------------------------------------------
-- Privileges (column-level for writes). service_role keeps full access.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.links, public.drinks, public.reviews, public.reset_requests from anon, authenticated;

grant select on public.profiles, public.drinks, public.reviews, public.links, public.reset_requests to authenticated;

grant insert (kind, target_user_id) on public.links to authenticated;

grant insert (name, type) on public.drinks to authenticated;
grant update (name, type) on public.drinks to authenticated;
grant delete on public.drinks to authenticated;

grant insert (drink_id, first_scores, first_note, final_scores, final_note) on public.reviews to authenticated;
grant update (first_scores, first_note, final_scores, final_note) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

grant update (resolved_at, resolved_by) on public.reset_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.drinks enable row level security;
alter table public.reviews enable row level security;
alter table public.reset_requests enable row level security;

-- profiles: read only. No client writes at all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

-- drinks
drop policy if exists drinks_select on public.drinks;
create policy drinks_select on public.drinks for select to authenticated using (true);

drop policy if exists drinks_insert on public.drinks;
create policy drinks_insert on public.drinks for insert to authenticated
  with check (created_by = (select auth.uid()) and (select public.is_active()));

-- The creator may rename or delete only while nobody else has reviewed the drink; admins always may.
drop policy if exists drinks_update on public.drinks;
create policy drinks_update on public.drinks for update to authenticated
  using (
    (select public.is_admin())
    or (
      created_by = (select auth.uid()) and (select public.is_active())
      and not exists (select 1 from public.reviews r where r.drink_id = drinks.id and r.author_id <> (select auth.uid()))
    )
  )
  with check (
    (select public.is_admin())
    or (
      created_by = (select auth.uid()) and (select public.is_active())
      and not exists (select 1 from public.reviews r where r.drink_id = drinks.id and r.author_id <> (select auth.uid()))
    )
  );

drop policy if exists drinks_delete on public.drinks;
create policy drinks_delete on public.drinks for delete to authenticated
  using (
    (select public.is_admin())
    or (
      created_by = (select auth.uid()) and (select public.is_active())
      and not exists (select 1 from public.reviews r where r.drink_id = drinks.id and r.author_id <> (select auth.uid()))
    )
  );

-- reviews
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to authenticated using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_active()));

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (author_id = (select auth.uid()) and (select public.is_active()))
  with check (author_id = (select auth.uid()) and (select public.is_active()));

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated
  using ((author_id = (select auth.uid()) and (select public.is_active())) or (select public.is_admin()));

-- links: read own (admin reads all), insert own invite links (admin may also insert reset links)
drop policy if exists links_select on public.links;
create policy links_select on public.links for select to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

drop policy if exists links_insert on public.links;
create policy links_insert on public.links for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_active())
    and (kind = 'invite' or (select public.is_admin()))
  );

-- reset_requests: admin only. Inserts happen through create_reset_request (service_role).
drop policy if exists reset_requests_select on public.reset_requests;
create policy reset_requests_select on public.reset_requests for select to authenticated
  using ((select public.is_admin()));

drop policy if exists reset_requests_update on public.reset_requests;
create policy reset_requests_update on public.reset_requests for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and (resolved_by is null or resolved_by = (select auth.uid())));
