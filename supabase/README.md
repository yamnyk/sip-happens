# supabase

Schema, RLS, triggers and functions for sip-happens. Owner applies them by hand.

## Apply the migrations

Migrations are plain numbered files (`0001_init.sql` to `0005_invite_revoke_and_resolved_at.sql`), not timestamp-named, and there is no `supabase/config.toml`. `supabase db push` and `supabase migration` do not apply here. Run the files by hand, in numeric order.

**Option A: SQL editor (simplest)**

1. Supabase dashboard, SQL Editor, New query.
2. Paste the full contents of each file in `supabase/migrations/` in numeric order, one Run per file.
3. Verify: for each script in `supabase/tests/`, paste it into a new query and Run. Each runs in one transaction and rolls back, so nothing persists. Success is the notice `<script>: all assertions passed`; a failure names the broken guarantee. Run them after every migration change.

   | Script                         | Covers                                                                                                                   |
   | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
   | `profiles_and_admin.sql`       | profiles read-only for clients, no admin smuggling via metadata, links/reset_requests/reviews column locks               |
   | `drinks.sql`                   | drinks privileges and RLS (creator, other user, admin, banned), checks, `guard_drink_type`, `drinks_other_needs_subtype` |
   | `drink_subtypes.sql`           | subtype privileges and RLS, name normalization, delete blocked while in use                                              |
   | `reviews.sql`                  | score and note constraints, one review per author per drink, ownership, admin delete                                     |
   | `functions_and_privileges.sql` | execute grants, `create_reset_request` caps, `claim_link`, `revoke_sessions`                                             |
   | `admin_paths.sql`              | what admins can and cannot do, disabled admin loses all power                                                            |
   | `inactive_user.sql`            | banned user or profile-less token can read but not write, un-ban is immediate                                            |
   | `invites_and_resets.sql`       | invite revoke by creator only (unused, unexpired), `reset_requests.resolved_at` set by trigger, not client-writable      |

**Option B: CLI, one file at a time**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db query --linked -f supabase/migrations/0001_init.sql
supabase db query --linked -f supabase/migrations/0002_drink_subtypes.sql
# ... and so on, in order
```

This runs each file through the Management API, so no database password is needed. Still run the SQL tests afterwards (paste them into the SQL editor).

## Re-running

Every migration is written so that re-running it does not fail: tables and indexes use `if not exists`, policies, triggers and constraints use `drop ... if exists` before create, functions use `create or replace`, and `validate constraint` is a no-op on a valid constraint. Be precise about what that means:

- Re-running does not fail, but it also does not change existing tables. `0001` uses `create table if not exists`, so editing a column definition in `0001` and re-running it will not alter a table that already exists. Schema changes to existing tables go into a new numbered migration (`alter table ...`), never into an old file.
- Functions, policies and triggers are replaced with the current text of the file, so re-running refreshes them.
- Re-running `0002` after `0004` drops and re-adds `drinks_other_needs_subtype` as `NOT VALID`. Run `0004` again afterwards to validate it.

## Then

1. Put `SUPABASE_SECRET_KEY` and `CRON_SECRET` (`openssl rand -hex 32`) into `.env.local`.
2. Create the first admin: `pnpm bootstrap-admin` (interactive nick, hidden password).
3. Dashboard, Authentication, Sign In / Providers: public signups stay disabled, email confirmations off.

## Optional: generate types

```bash
pnpm dlx supabase gen types typescript --project-id <your-project-ref> --schema public > contract/database.types.ts
```

## Notes

- `claim_link` and `create_reset_request` are executable by `service_role` only (the Vercel functions). `is_admin()` is executable by `authenticated` and `service_role`.
- A banned user's existing session works until their JWT expires.
