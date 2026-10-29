# supabase

Schema, RLS, triggers and functions for sip-happens. Owner applies them by hand.

## Apply the migration

**Option A: SQL editor (simplest)**

1. Supabase dashboard, SQL Editor, New query.
2. Paste the full contents of each file in `supabase/migrations/` in numeric order (`0001_init.sql`, `0002_drink_subtypes.sql`, `0003_reset_request_per_user_cap.sql`), one Run per file. All are idempotent, re-running is safe.
3. Verify: paste `supabase/tests/admin_flag.sql`, Run. Expect the notice `admin_flag: all assertions passed`. It rolls back, nothing persists. Any failure names the broken guarantee.

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
pnpm dlx supabase gen types typescript --project-id <your-project-ref> --schema public > src/types/database.types.ts
```

## Notes

- `claim_link` and `create_reset_request` are executable by `service_role` only (the Vercel functions). `is_admin()` is executable by `authenticated` and `service_role`.
- A banned user's existing session works until their JWT expires.
