-- Custom drink types that live under the fixed type 'other' (whisky, rum, vodka, ...).
-- Idempotent: safe to re-run in the SQL editor. Apply AFTER 0001_init.sql.

create table if not exists public.drink_subtypes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- Identity of a name: NFC, trimmed, whitespace collapsed, case-insensitive. "Whisky" = " whisky  ".
  name_normalized text generated always as (
    lower(regexp_replace(btrim(normalize(name, NFC)), '\s+', ' ', 'g'))
  ) stored,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists drink_subtypes_name_normalized_key on public.drink_subtypes (name_normalized);
create index if not exists drink_subtypes_created_by_idx on public.drink_subtypes (created_by);

alter table public.drinks
  add column if not exists subtype_id uuid references public.drink_subtypes (id) on delete restrict;
create index if not exists drinks_subtype_id_idx on public.drinks (subtype_id);

-- Only 'other' drinks carry a subtype.
alter table public.drinks drop constraint if exists drinks_subtype_only_other;
alter table public.drinks
  add constraint drinks_subtype_only_other check (subtype_id is null or type = 'other');

-- New and edited 'other' drinks must name a subtype. NOT VALID so legacy 'other' rows do not block the migration.
alter table public.drinks drop constraint if exists drinks_other_needs_subtype;
alter table public.drinks
  add constraint drinks_other_needs_subtype check (type <> 'other' or subtype_id is not null) not valid;

-- Privileges: everyone signed in reads and adds types; only admins rename or delete (delete is blocked while in use).
revoke all on public.drink_subtypes from anon, authenticated;
grant select on public.drink_subtypes to authenticated;
grant insert (name) on public.drink_subtypes to authenticated;
grant update (name) on public.drink_subtypes to authenticated;
grant delete on public.drink_subtypes to authenticated;

grant insert (name, type, subtype_id) on public.drinks to authenticated;
grant update (name, type, subtype_id) on public.drinks to authenticated;

alter table public.drink_subtypes enable row level security;

drop policy if exists drink_subtypes_select on public.drink_subtypes;
create policy drink_subtypes_select on public.drink_subtypes for select to authenticated using (true);

drop policy if exists drink_subtypes_insert on public.drink_subtypes;
create policy drink_subtypes_insert on public.drink_subtypes for insert to authenticated
  with check (created_by = (select auth.uid()) and (select public.is_active()));

drop policy if exists drink_subtypes_update on public.drink_subtypes;
create policy drink_subtypes_update on public.drink_subtypes for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists drink_subtypes_delete on public.drink_subtypes;
create policy drink_subtypes_delete on public.drink_subtypes for delete to authenticated
  using ((select public.is_admin()));
