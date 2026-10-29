# CLAUDE.md - sip-happens

Friends-only PWA for quick alcohol reviews (wine, port, gin first). Invite-only accounts. Full setup and env table are in `README.md`.

## Stack

Vite, React 19, TypeScript 7, Tailwind v4, react-router, TanStack Query, zod, Supabase (Postgres, Auth, RLS), Vercel Functions, vite-plugin-pwa, idb-keyval, Vitest, Oxlint, Prettier.

## Layout

- `src/config/criteria.ts`: single source of truth for drink types, criteria and weights.
- `src/lib/`: shared contract. `score.ts` (totals), `nick.ts` (`nickToEmail`), `schemas.ts` (zod), `review.ts`, `supabase.ts`. Imported by client and server.
- `src/features/`: UI by area (`auth`, `review`, `invites`, `browse`, `admin`).
- `src/data/queries.ts`: all data fetching (fetch-all, cached). Aggregation happens client-side.
- `src/strings.ts`, `src/features/*/strings.ts`: all UI text.
- `server/handlers/`: pure handler logic `(deps, input) => result`, unit-tested with mocked Supabase.
- `api/`: thin Web-standard wrappers around `server/handlers/`. Only six routes exist. Do not add more.
- `supabase/`: migrations, RLS, triggers, SQL tests. Owner applies them by hand.
- `scripts/bootstrap-admin.ts`: creates the first admin.
- `public/`: PWA icons (`icon.svg` source, generated PNGs).

## Commands

- Package manager is pnpm.
- `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm preview`
- `pnpm bootstrap-admin` (owner only, interactive)

## Rules

- Never read `.env.local` or print any env value. Check presence by variable name only.
- `SUPABASE_SECRET_KEY`, `CRON_SECRET` and `SB_DB_PASSWORD` never get a `VITE_` prefix and never reach the client bundle.
- `SB_DB_PASSWORD` is local CLI only. Never set it on Vercel.
- Agents never run git. The owner manages git and deploys.
- No em-dash or en-dash anywhere. Hyphen only.
- UI strings are Ukrainian. Code, comments and docs are English.
- Do not add npm dependencies without asking the owner.
- Existing Supabase skills (`skills/`, `.agents/`, `.claude/`, `.augment/`) are read-only.
