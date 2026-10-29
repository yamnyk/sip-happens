# sip-happens

A friends-only PWA for logging quick reviews of alcohol (mostly wine, port and gin). Members log drinks, read each other's reviews, and see who likes what. Weighted criteria turn a few taps into a comparable score. Invite-only accounts, no public pages.

## Stack

- Vite, React 19, TypeScript
- Tailwind CSS v4, hand-rolled components
- react-router, TanStack Query, zod
- Supabase (Postgres, Auth, Row Level Security)
- Vercel (static SPA plus Vercel Functions in `api/`)
- vite-plugin-pwa (installable, online only), idb-keyval (drafts)
- Vitest for pure logic

## Scripts

| Command                             | What it does                                          |
| ----------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                          | Vite dev server                                       |
| `pnpm build`                        | Typecheck, then production build into `dist/`         |
| `pnpm typecheck`                    | `tsc --noEmit`                                        |
| `pnpm test`                         | Vitest (pure logic and handler unit tests)            |
| `pnpm lint`                         | Oxlint                                                |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                |
| `pnpm preview`                      | Serve the built `dist/` locally                       |
| `pnpm bootstrap-admin`              | Create the first admin (interactive, hidden password) |

## Environment variables

Names match `.env.example` exactly. Values are never committed.

| Name                            | Where it is set                               | Client or server                     | Secret |
| ------------------------------- | --------------------------------------------- | ------------------------------------ | ------ |
| `VITE_SUPABASE_URL`             | `.env.local`, Vercel env vars                 | Client (bundled) and server (reused) | no     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel env vars                 | Client (bundled)                     | no     |
| `SUPABASE_SECRET_KEY`           | `.env.local`, Vercel env vars                 | Server only                          | yes    |
| `CRON_SECRET`                   | `.env.local`, Vercel env vars                 | Server only                          | yes    |
| `SB_DB_PASSWORD`                | `.env.local` only, for the local Supabase CLI | Local CLI only                       | yes    |

Rules:

- `SB_DB_PASSWORD` is never set on Vercel.
- The secret key never gets a `VITE_` prefix and never reaches the client bundle.
- `.env.local` is gitignored. Never paste secret values into chat or issues.

## First-time setup

1. `pnpm install`, then `cp .env.example .env.local` and fill in the `VITE_` values.
2. Apply the schema per [`supabase/README.md`](supabase/README.md): run every file in `supabase/migrations/` in numeric order (`0001_init.sql`, `0002_drink_subtypes.sql`) in the SQL editor (or `supabase db push`). Then in the Supabase dashboard, Authentication, Sign In / Providers: public signups stay disabled and email confirmations stay off.
3. In the Supabase dashboard, Project Settings, API Keys, Secret keys: copy the secret key into `.env.local` as `SUPABASE_SECRET_KEY`.
4. Generate a cron secret with `openssl rand -hex 32` and put it into `.env.local` as `CRON_SECRET`.
5. Run `pnpm bootstrap-admin` and enter the first admin's nick and password.
6. Push the repo to GitHub.
7. In Vercel, import the repo.
8. In Vercel Environment Variables, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `CRON_SECRET`. Do not set `SB_DB_PASSWORD`.
9. Set the Function Region to the region nearest your Supabase project, so `/api` calls do not cross continents.
10. Deploy.

## Vercel notes

- **Cron:** `vercel.json` runs `/api/keepalive` daily at `0 6 * * *`. On the Hobby plan, cron runs once a day with up to an hour of timing drift.
- **Keepalive:** the daily call does a real database read, so the Supabase free project does not pause after about a week of inactivity. It requires `Authorization: Bearer $CRON_SECRET`.
- **Hobby plan:** non-commercial use only.
- **Rewrites:** every path except `/api/*` serves `index.html`, so deep links like `/join/{token}` work.
- **Local `/api` testing:** use `vercel dev`. Without it, test the functions on a preview deployment.

## Architecture

- A single-page React app is served as static files and installs as a PWA. It is online only, with no offline sync.
- The browser talks to Supabase directly with the publishable key. Row Level Security decides what each user can read and write.
- Only six Vercel Functions exist: `register`, `invite-status`, `reset-request`, `reset-complete`, `admin-user`, `keepalive`.
- Those functions use the secret key on the server. It never reaches the browser.
- Handler logic lives in `server/handlers/` as pure functions. Files in `api/` are thin wrappers.
- Login is nickname plus password. Supabase Auth needs an email, so each nick maps to a synthetic address: first 32 hex chars of SHA-256 over the NFC-normalized lowercase nick, at `@sip.invalid`. `nickToEmail()` in `src/lib/nick.ts` is shared by client and server. No email is ever sent.
- Criteria and weights live in `src/config/criteria.ts`. Totals are computed in TypeScript, so changing a weight changes every score.

## Invite flow

1. Any logged-in user creates an invite link on the Invites page. Each link is single-use and expires after 7 days, enforced in the database.
2. The recipient opens `/join/{token}`. If the link is still valid, the page shows who invited them.
3. They choose a nick and password. `/api/register` claims the link and creates the account in one step.
4. Expired or used links show a dead-link message: ask the inviter for a new one.
5. Each profile stores `invited_by`, and the admin sees the full invite tree with timestamps.

## Password reset flow

1. On the public forgot-password form, the person enters their nick and the nick of whoever invited them.
2. The request is rate limited (one pending request per nick, 20 per hour globally). The response is always the same generic message, so nicks cannot be enumerated.
3. The admin sees a warning icon on that user's row and resolves it. This creates a 7-day, single-use reset link.
4. The admin sends the link manually. The app has no email.
5. `/reset/{token}` sets a new password through `/api/reset-complete`.

## Manual smoke checklist

Before deploy:

- [ ] `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- [ ] `supabase/tests/admin_flag.sql` prints `admin_flag: all assertions passed` in the SQL editor.
- [ ] `.gitignore` covers `.env.local`.

On a Vercel preview:

- [ ] Log in as the bootstrapped admin.
- [ ] Generate an invite and copy the link.
- [ ] Register a second user through the link.
- [ ] An expired link and a reused link are both rejected.
- [ ] Post a first-impression-only review and a final-only review.
- [ ] A final with a short note (under 30 characters) is blocked.
- [ ] A draft survives a page reload.
- [ ] Catalog filter "white wine" shows only white wines.
- [ ] Person page shows correct averages per type.
- [ ] A reset request shows the warning icon in admin.
- [ ] Resolving it produces a working reset link.
- [ ] The PWA installs on a phone.

## Status

- **Verified by the owner:** `0001_init.sql` was applied and the app works "okay-ish" locally. **Not verified:** `0002_drink_subtypes.sql` has not been run yet.
- **Not verified:** the Vercel preview deployment has not been tested.
- **Not verified:** the PWA install has not been tested on a device.
- **Not verified:** `pnpm bootstrap-admin` has not been run.
- **Not verified:** `revoke_sessions()` deletes from `auth.sessions`; the function owner needs that privilege on the Supabase `auth` schema. If it fails, bans and password resets still apply but old refresh tokens survive; the handlers log the failure and continue.
- **Not verified:** extensionless-import risk on Vercel was addressed by adding `.js` extensions to server-side imports; confirm on the first preview that `/api/*` loads.
- **Known gaps (accepted):** `GET /api/invite-status?token=` puts the token in a query string (Vercel logs); JS `toLowerCase` and Postgres `lower` can disagree on rare Unicode nicks (the unique index still protects identity); login brute-force relies on Supabase Auth rate limits; `register` can leave a released invite if GoTrue created the user but the response was lost.
