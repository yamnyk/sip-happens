# supabase

Schema, RLS, triggers and functions for sip-happens. Owner applies them by hand.

## Apply the migration

**Option A: SQL editor (simplest)**

1. Supabase dashboard, SQL Editor, New query.
2. Paste the full contents of each file in `supabase/migrations/` in numeric order (`0001_init.sql`, `0002_drink_subtypes.sql`, `0003_reset_request_per_user_cap.sql`, `0004_validate_other_subtype.sql`), one Run per file. All are idempotent, re-running is safe.
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

**Option B: CLI**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --password "$SB_DB_PASSWORD"
```

`SB_DB_PASSWORD` is the database password from `.env.local`. Local CLI use only, never set it on Vercel.

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
