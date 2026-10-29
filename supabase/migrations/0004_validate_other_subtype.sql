-- 0002 added drinks_other_needs_subtype as NOT VALID. A pre-check on 2026-10-29 found no 'other' drinks
-- without a subtype, so the constraint now also covers existing rows.
alter table public.drinks validate constraint drinks_other_needs_subtype;
